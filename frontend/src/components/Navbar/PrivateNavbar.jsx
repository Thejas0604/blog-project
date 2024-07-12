import React from "react";
import { Link } from "react-router-dom";
import Logo from "./Logo";
import PrivateNav from "./PrivateNav";



function PrivateNavbar() {
  return (
    <div>
      <header className="sticky top-0 z-[1] mx-auto  flex w-full max-w-7xl flex-wrap items-center justify-between border-b border-gray-100 bg-background p-[2em] font-sans font-bold uppercase text-text-primary backdrop-blur-[100px] dark:border-gray-800 dark:bg-d-background dark:text-d-text-primary">
      <Logo/>
      <PrivateNav/>
      </header>
    </div>
  );
}

export default PrivateNavbar;
