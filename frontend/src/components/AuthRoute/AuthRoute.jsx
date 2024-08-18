import React from "react";
import Login from "../User/Login";
import { checkAuthStatus } from "../../Services/usersAPI";
import { useQuery } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";

const AuthRoute = ({ children }) => {
  const { isError, isLoading, data, error, refetch } = useQuery({
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
