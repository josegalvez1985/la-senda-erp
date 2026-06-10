import { useLocation } from 'react-router-dom';
import { Header } from '../components/Header';
import { menu } from '../data/menu';

export function Modulo() {
  const { pathname } = useLocation();
  const all = menu.flatMap((g) => (g.items ?? []).map((it) => ({ ...it, group: g.label })));
  const item = all.find((i) => i.to === pathname);

  return (
    <div style={{ paddingBottom: 32 }}>
      <Header title={item?.label ?? 'Módulo'} subtitle={item?.group} />
      <div className="modulo-empty">
        <span className="modulo-empty-icon">
          <ion-icon name={item?.icon ?? 'construct-outline'} />
        </span>
        <div className="modulo-empty-title">{item?.label ?? 'Módulo'}</div>
        <div className="modulo-empty-text">Este módulo está en construcción. Pronto vas a poder gestionarlo desde acá.</div>
        <span className="modulo-empty-tag">
          <ion-icon name="construct-outline" /> Próximamente
        </span>
      </div>
    </div>
  );
}
