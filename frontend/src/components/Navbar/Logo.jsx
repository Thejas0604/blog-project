import React from 'react';
import logoImage from '../../assets/logo.png'; 

const Logo = () => {
    return (
        <div className="logo w-16 h-16">
            <img src={logoImage} alt="logo" />
        </div>
    );
};

export default Logo;