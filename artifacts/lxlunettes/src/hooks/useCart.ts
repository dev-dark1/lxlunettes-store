import { useState, useEffect, useCallback } from 'react';

export type CartItem = {
  productId: string;
  name: string;
  price: number;
  salePrice?: number | null;
  image?: string | null;
  quantity: number;
  sku: string;
};

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  const readStoredCart = useCallback((): CartItem[] => {
    const saved = localStorage.getItem('lxlunettes_cart');
    if (!saved) return [];

    try {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      localStorage.removeItem('lxlunettes_cart');
      return [];
    }
  }, []);

  useEffect(() => {
    setItems(readStoredCart());
    setIsHydrated(true);
  }, [readStoredCart]);

  useEffect(() => {
    const handleUpdate = () => {
      setItems(readStoredCart());
    };
    window.addEventListener('cart-updated', handleUpdate);
    return () => window.removeEventListener('cart-updated', handleUpdate);
  }, [readStoredCart]);

  const addToCart = useCallback((item: CartItem) => {
    setItems(prev => {
      const existing = prev.find(i => i.productId === item.productId);
      let next;
      if (existing) {
        next = prev.map(i => i.productId === item.productId ? { ...i, quantity: i.quantity + item.quantity } : i);
      } else {
        next = [...prev, item];
      }
      localStorage.setItem('lxlunettes_cart', JSON.stringify(next));
      window.dispatchEvent(new Event('cart-updated'));
      return next;
    });
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setItems(prev => {
      const next = prev.filter(i => i.productId !== productId);
      localStorage.setItem('lxlunettes_cart', JSON.stringify(next));
      window.dispatchEvent(new Event('cart-updated'));
      return next;
    });
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity < 1) return removeFromCart(productId);
    setItems(prev => {
      const next = prev.map(i => i.productId === productId ? { ...i, quantity } : i);
      localStorage.setItem('lxlunettes_cart', JSON.stringify(next));
      window.dispatchEvent(new Event('cart-updated'));
      return next;
    });
  }, [removeFromCart]);

  const clearCart = useCallback(() => {
    setItems([]);
    localStorage.removeItem('lxlunettes_cart');
    window.dispatchEvent(new Event('cart-updated'));
  }, []);

  const totalItems = items.reduce((acc, item) => acc + item.quantity, 0);
  const totalPrice = items.reduce((acc, item) => acc + (item.salePrice || item.price) * item.quantity, 0);

  return { items, addToCart, removeFromCart, updateQuantity, clearCart, totalItems, totalPrice, isHydrated };
}
