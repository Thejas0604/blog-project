import { NavLink } from "react-router-dom";

const Nav = () => {
  return (
    <>
      <NavLink to="/">Home</NavLink>

      <NavLink to="/create-post">Create Post</NavLink>

      <NavLink to="/list">List Post</NavLink>
    </>
  );
};

export default Nav;
