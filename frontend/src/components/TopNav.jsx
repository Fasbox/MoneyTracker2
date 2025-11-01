import { NavLink } from "react-router-dom";

export default function TopNav() {
  return (
    <nav className="topnav">
      <NavLink to="/dashboard" className={({isActive}) => isActive ? "topnav__link is-active" : "topnav__link"}>
        Dashboard
      </NavLink>
      <NavLink to="/transactions" className={({isActive}) => isActive ? "topnav__link is-active" : "topnav__link"}>
        Transacciones
      </NavLink>
      <NavLink to="/profile" className={({isActive}) => isActive ? "topnav__link is-active" : "topnav__link"}>
        Perfil
      </NavLink>
    </nav>
  );
}
