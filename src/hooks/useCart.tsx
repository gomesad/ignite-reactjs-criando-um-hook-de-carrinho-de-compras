import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { isConstructorDeclaration } from 'typescript';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const productIndexInCart = cart.findIndex(product => product.id === productId);
      const responseStock = await api.get<Stock>(`/stock/${productId}`);
      const stock = responseStock.data;

      let tmpCart = [] as Product[];
      let newStock = 0;

      if (productIndexInCart === -1) {
        const responseProduct = await api.get<Product>(`/products/${productId}`);
        const newProduct = responseProduct.data;
        newProduct.amount = 1;
        tmpCart = [...cart, newProduct];
        newStock = newProduct.amount;
      } else {
        newStock = cart[productIndexInCart].amount + 1;
      }

      if (newStock > stock.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if (productIndexInCart !== -1) {
        tmpCart = cart.map(product => {
          if (product.id === productId) {
            product.amount = product.amount + 1;
          }
          return product;
        });
      }

      setCart(tmpCart);

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(tmpCart));

    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const isProductInCart = cart.filter(product => product.id === productId)[0];

      if (!isProductInCart) {
        toast.error('Erro na remoção do produto');
        return;
      }

      const newCart = cart.filter(product => {
        if (product.id !== productId) {
          return product;
        }
      });
      setCart(newCart);

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));

    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }

      const responseStock = await api.get<Stock>(`/stock/${productId}`);
      const stock = responseStock.data;

      if (amount > stock.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      } else {
        const newCart = cart.map(product => {
          if (product.id === productId) {
            product.amount = amount;
          }
          return product;
        });

        setCart(newCart);

        localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart));
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
