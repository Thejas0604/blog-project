import { NavLink } from "react-router-dom";

const PrivateNav = () => {
  return (
    <>
      <NavLink to="/">Home</NavLink>

      <NavLink to="/create-post">Create Post</NavLink>

      <NavLink to="/list">List Post</NavLink>
      <div>PrivateNavbar</div>
    </>
  );
};

export default PrivateNav;
