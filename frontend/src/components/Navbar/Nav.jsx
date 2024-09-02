import { Link } from "react-router-dom";
import { Button, Navbar } from "flowbite-react";
import logoImage from "../../assets/logo.png";

const Nav = () => {
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
        <Link to={`/login`}>
          <Button>Login</Button>
        </Link>
        <Navbar.Toggle />
      </div>
      <Navbar.Collapse>
        <Navbar.Link href="/" active>
          Home
        </Navbar.Link>
        <Navbar.Link href="/list">Show all posts</Navbar.Link>
      </Navbar.Collapse>
    </Navbar>
  );
};

export default Nav;
