import React from "react";
import { checkAuthStatus } from "../../Services/usersAPI";
import { useQuery } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";

const AuthRoute = ({ children }) => {
  const { isLoading, data } = useQuery({
    queryKey: ["user-auth"],
    queryFn: checkAuthStatus,
  });
  if (isLoading) {
    return <h1>Loading..</h1>;
  }
  if (!data) {
    return <Navigate to={"/login"} />;
  }
  return children;
};

export default AuthRoute;
