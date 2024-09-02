import { useNavigate, NavLink } from "react-router-dom";
import { logoutAPI } from "../../Services/usersAPI";
import { useMutation } from "@tanstack/react-query";
import { useDispatch } from "react-redux";
import { logout } from "../../../redux/slices/authSlices";
import { Link } from "react-router-dom";
import { Button, Navbar } from "flowbite-react";
import logoImage from "../../assets/logo.png";

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
    <Navbar fluid rounded>
      <Navbar.Brand href="/">
        <img
          src={logoImage}
          className="mr-3 h-6 sm:h-9"
          alt="Flowbite React Logo"
        />
        <span className="self-center whitespace-nowrap text-xl font-semibold dark:text-white">
          BlogMe
        </span>
      </Navbar.Brand>
      <div className="flex md:order-2">
        <Button onClick={logoutHandler}>Logout</Button>
        <Navbar.Toggle />
      </div>
      <Navbar.Collapse>
        <Navbar.Link href="/" active>
          Home
        </Navbar.Link>
        <Navbar.Link href="/list">Show all posts</Navbar.Link>
        <Navbar.Link href="/dashboard" >
          Dashboard
        </Navbar.Link>
      </Navbar.Collapse>
    </Navbar>
  );
};

export default PrivateNav;
