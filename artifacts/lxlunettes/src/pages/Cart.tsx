import { useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { useCart } from '@/hooks/useCart';
import { Button } from '@/components/ui/button';
import { Trash2, Plus, Minus, ArrowRight, ShoppingBag } from 'lucide-react';
import { motion } from 'framer-motion';

export default function CartPage() {
  const { items, removeFromCart, updateQuantity, totalPrice, clearCart } = useCart();
  const [, setLocation] = useLocation();

  if (items.length === 0) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center container mx-auto px-4 py-20">
        <div className="w-24 h-24 rounded-full bg-card border border-border flex items-center justify-center mb-8 text-muted-foreground">
          <ShoppingBag className="w-10 h-10" />
        </div>
        <h1 className="text-3xl font-serif text-foreground mb-4 tracking-widest uppercase">Votre Panier est Vide</h1>
        <p className="text-muted-foreground mb-10 max-w-md text-center font-light leading-relaxed">
          Il semble que vous n'ayez pas encore trouvé la monture parfaite. Parcourez notre collection pour découvrir nos nouveautés.
        </p>
        <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground px-10 py-6 tracking-[0.2em] uppercase rounded-sm">
          <Link href="/boutique">Découvrir la collection</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 lg:py-20">
      <h1 className="text-3xl md:text-5xl font-serif text-foreground mb-12 tracking-widest uppercase">Mon Panier</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="hidden md:grid grid-cols-12 gap-4 pb-4 border-b border-border text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-medium">
            <div className="col-span-6">Produit</div>
            <div className="col-span-2 text-center">Prix</div>
            <div className="col-span-2 text-center">Quantité</div>
            <div className="col-span-2 text-right">Total</div>
          </div>
          
          <div className="flex flex-col gap-6 md:gap-0">
            {items.map((item, index) => (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                key={item.productId} 
                className="grid grid-cols-1 md:grid-cols-12 gap-4 py-6 border-b border-border items-center bg-card md:bg-transparent p-4 md:p-0 rounded-sm"
              >
                <div className="col-span-1 md:col-span-6 flex gap-4 items-center">
                  <Link href={`/produits/${item.productId}`} className="w-24 h-24 bg-muted/60 dark:bg-[#111] shrink-0 border border-border flex items-center justify-center p-2 rounded-sm overflow-hidden">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-[10px] text-muted-foreground uppercase">Image</span>
                    )}
                  </Link>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-secondary uppercase tracking-[0.2em] mb-1">SKU: {item.sku}</span>
                    <Link href={`/produits/${item.productId}`} className="text-lg font-serif text-foreground hover:text-primary transition-colors">
                      {item.name}
                    </Link>
                    <button 
                      onClick={() => removeFromCart(item.productId)}
                      className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 mt-2 w-fit transition-colors"
                    >
                      <Trash2 className="w-3 h-3" /> Supprimer
                    </button>
                  </div>
                </div>
                
                <div className="col-span-1 md:col-span-2 flex justify-between md:justify-center items-center">
                  <span className="md:hidden text-xs text-muted-foreground uppercase">Prix:</span>
                  <div className="flex flex-col md:items-center">
                    {item.salePrice ? (
                       <>
                         <span className="text-primary font-medium">{item.salePrice.toFixed(2)} MAD</span>
                         <span className="text-muted-foreground line-through text-xs">{item.price.toFixed(2)} MAD</span>
                       </>
                    ) : (
                      <span className="text-foreground font-medium">{item.price.toFixed(2)} MAD</span>
                    )}
                  </div>
                </div>
                
                <div className="col-span-1 md:col-span-2 flex justify-between md:justify-center items-center">
                  <span className="md:hidden text-xs text-muted-foreground uppercase">Quantité:</span>
                  <div className="flex items-center gap-3 border border-border px-3 py-1 rounded-sm bg-background">
                    <button 
                      onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                      className="text-muted-foreground hover:text-foreground transition-colors p-1"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-sm w-6 text-center">{item.quantity}</span>
                    <button 
                      onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                      className="text-muted-foreground hover:text-foreground transition-colors p-1"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                
                <div className="col-span-1 md:col-span-2 flex justify-between md:justify-end items-center">
                  <span className="md:hidden text-xs text-muted-foreground uppercase">Total:</span>
                  <span className="text-lg font-medium text-foreground">
                    {((item.salePrice || item.price) * item.quantity).toFixed(2)} MAD
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
          
          <div className="flex justify-between items-center mt-4">
            <Button variant="outline" className="border-border text-muted-foreground hover:text-foreground hover:bg-card" onClick={clearCart}>
              Vider le panier
            </Button>
            <Button variant="link" asChild className="text-secondary hover:text-primary tracking-[0.1em] uppercase text-xs">
              <Link href="/boutique">Continuer les achats</Link>
            </Button>
          </div>
        </div>
        
        {/* SUMMARY */}
        <div className="lg:col-span-1">
          <div className="bg-card border border-border p-8 rounded-sm sticky top-32 shadow-xl">
            <h2 className="text-2xl font-serif text-foreground mb-6 tracking-widest uppercase">Résumé</h2>
            
            <div className="flex flex-col gap-4 mb-8">
              <div className="flex justify-between items-center text-muted-foreground">
                <span>Sous-total</span>
                <span>{totalPrice.toFixed(2)} MAD</span>
              </div>
              <div className="flex justify-between items-center text-muted-foreground pb-4 border-b border-border">
                <span>Livraison</span>
                <span className="text-primary text-xs uppercase tracking-widest">Gratuite</span>
              </div>
              <div className="flex justify-between items-end mt-2">
                <span className="text-lg text-foreground font-medium uppercase tracking-widest">Total</span>
                <span className="text-3xl text-primary font-medium">{totalPrice.toFixed(2)} MAD</span>
              </div>
              <p className="text-[10px] text-muted-foreground text-right">Taxes incluses</p>
            </div>
            
            <Button 
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-7 text-sm tracking-[0.2em] uppercase font-bold rounded-sm shadow-[0_0_20px_rgba(201,168,76,0.2)]"
              onClick={() => setLocation('/commander')}
            >
              Commander <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            
            <div className="mt-6 flex flex-col gap-3">
              <div className="flex items-center gap-2 justify-center text-xs text-muted-foreground">
                <span>Paiement sécurisé via WhatsApp</span>
              </div>
              <div className="flex justify-center gap-2 opacity-50 grayscale">
                 {/* Fake logos just for premium feel */}
                 <div className="w-8 h-5 border border-border rounded flex items-center justify-center text-[8px] font-bold">VISA</div>
                 <div className="w-8 h-5 border border-border rounded flex items-center justify-center text-[8px] font-bold">MC</div>
                 <div className="w-8 h-5 border border-border rounded flex items-center justify-center text-[8px] font-bold">AMEX</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
