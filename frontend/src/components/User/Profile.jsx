import React, { useEffect } from "react";
import { checkAuthStatus } from "../../Services/usersAPI";
import { useQuery } from "@tanstack/react-query";
import { useDispatch } from "react-redux";
import { isAuthenticated } from "../../../redux/slices/authSlices";

function Profile() {
  const { isError, isLoading, data, error, refetch } = useQuery({
    queryKey: ["user-auth"],
    queryFn: checkAuthStatus,
  });
  //console.log(data);
  //dispatch
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(isAuthenticated(data));
  }, [data]);
  return <div>Profile</div>;
}

export default Profile;
