import { useNavigate, NavLink } from "react-router-dom";
import { logoutAPI } from "../../Services/usersAPI";
import { useMutation } from "@tanstack/react-query";
import { useDispatch } from "react-redux";
import { logout } from "../../../redux/slices/authSlices";

const PrivateNav = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const logoutMutation = useMutation({
    mutationKey: ["user-logout"],
    mutationFn: logoutAPI,
  });
  const logoutHandler = async () => {
    logoutMutation
      .mutateAsync()
      .then(() => {
        dispatch(logout());
        navigate("/");
      })
      .catch((err) => console.log(err));
  };
  return (
    <>
      <NavLink to="/">Home</NavLink>

      <NavLink to="/create-post">Create Post</NavLink>

      <NavLink to="/list">List Post</NavLink>
      <NavLink>
        <button onClick={logoutHandler}>Logout</button>
      </NavLink>
      <div>PrivateNavbar</div>
    </>
  );
};

export default PrivateNav;
