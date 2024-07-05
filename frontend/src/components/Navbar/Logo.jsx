import React from 'react';
import logoImage from '../../assets/logo.png'; 
import { Link } from "react-router-dom";

const Logo = () => {
    return (
        <div className="logo w-16 h-16">
            <Link to="/"><img src={logoImage} alt="logo" /></Link>
        </div>
    );
};

export default Logo;