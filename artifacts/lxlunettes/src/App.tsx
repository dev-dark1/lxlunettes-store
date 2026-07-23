import { Router as WouterRouter, Route, Switch, useLocation } from 'wouter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { AdminLayout } from '@/components/AdminLayout';
import { ToasterComponent } from '@/components/ui/toaster';

// Pages
import Home from '@/pages/Home';
import Boutique from '@/pages/Boutique';
import ProductDetail from '@/pages/ProductDetail';
import CartPage from '@/pages/Cart';
import CheckoutPage from '@/pages/Checkout';
import SignInPage from '@/pages/SignIn';
import ProfilPage from '@/pages/Profil';
import Marques from '@/pages/Marques';
import Sale from '@/pages/Sale';
import FavoritesPage from '@/pages/Favorites';
import { AboutPage, ContactPage, DeliveryPage, FaqPage, LegalNoticesPage, PrivacyPage, ReturnsPage, TermsPage } from '@/pages/InfoPages';
import AdminLogin from '@/pages/admin/AdminLogin';
import AdminDashboard from '@/pages/admin/Dashboard';
import AdminProducts from '@/pages/admin/Products';
import AdminCategories from '@/pages/admin/Categories';
import AdminBrands from '@/pages/admin/Brands';
import AdminOrders from '@/pages/admin/Orders';
import AdminCustomers from '@/pages/admin/Customers';
import AdminReviews from '@/pages/admin/Reviews';
import AdminPromotions from '@/pages/admin/Promotions';
import AdminStock from '@/pages/admin/Stock';
import AdminSettings from '@/pages/admin/Settings';
import AdminMedia from '@/pages/admin/Media';

const queryClient = new QueryClient();

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");



function AppRoutes() {
  const [location] = useLocation();
  const isAdmin = location.startsWith('/admin');

  return (
    <QueryClientProvider client={queryClient}>
      {isAdmin ? (
        location === '/admin/login' ? (
          <AdminLogin />
        ) : (
          <AdminLayout>
            <Switch>
              <Route path="/admin" component={AdminDashboard} />
              <Route path="/admin/produits" component={AdminProducts} />
              <Route path="/admin/categories" component={AdminCategories} />
              <Route path="/admin/marques" component={AdminBrands} />
              <Route path="/admin/commandes" component={AdminOrders} />
              <Route path="/admin/clients" component={AdminCustomers} />
              <Route path="/admin/avis" component={AdminReviews} />
              <Route path="/admin/promotions" component={AdminPromotions} />
              <Route path="/admin/stock" component={AdminStock} />
              <Route path="/admin/medias" component={AdminMedia} />
              <Route path="/admin/parametres" component={AdminSettings} />
              <Route>
                 <div className="text-center py-20 text-muted-foreground font-serif">Page non trouvée</div>
              </Route>
            </Switch>
          </AdminLayout>
        )
      ) : (
        <Layout>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/boutique"><Boutique /></Route>
            <Route path="/hommes"><Boutique type="homme" /></Route>
            <Route path="/femmes"><Boutique type="femme" /></Route>
            <Route path="/unisexe"><Boutique type="unisexe" /></Route>
            <Route path="/marques" component={Marques} />
            <Route path="/sale" component={Sale} />
            <Route path="/promotions" component={Sale} />
            <Route path="/nouveautes"><Boutique newOnly /></Route>
            <Route path="/favoris" component={FavoritesPage} />
            <Route path="/produits/:slug" component={ProductDetail} />
            <Route path="/panier" component={CartPage} />
            <Route path="/commander" component={CheckoutPage} />
            <Route path="/sign-in" component={SignInPage} />
            <Route path="/profil" component={ProfilPage} />
            <Route path="/contact" component={ContactPage} />
            <Route path="/a-propos" component={AboutPage} />
            <Route path="/faq" component={FaqPage} />
            <Route path="/livraison" component={DeliveryPage} />
            <Route path="/retours" component={ReturnsPage} />
            <Route path="/cgv" component={TermsPage} />
            <Route path="/confidentialite" component={PrivacyPage} />
            <Route path="/mentions-legales" component={LegalNoticesPage} />
            
            <Route>
              <div className="text-center py-32 text-muted-foreground font-serif text-2xl">Page non trouvée</div>
            </Route>
          </Switch>
        </Layout>
      )}
      <ToasterComponent />
    </QueryClientProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <AppRoutes />
    </WouterRouter>
  );
}

export default App;
