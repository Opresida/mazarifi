import { Route, Switch } from 'wouter';
import { Landing } from './pages/Landing';
import { UserDashboard } from './pages/UserDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { PoolPage } from './pages/PoolPage';
import { MinhaAplicacaoPage } from './pages/MinhaAplicacaoPage';

export function App() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/dashboard" component={UserDashboard} />
      <Route path="/minhas-aplicacoes" component={MinhaAplicacaoPage} />
      <Route path="/pool/:key" component={PoolPage} />
      <Route path="/admin" component={AdminDashboard} />
      <Route component={Landing} />
    </Switch>
  );
}
