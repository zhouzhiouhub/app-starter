import { Button } from "antd";
import { useNavigate } from "react-router-dom";
import { logoutCurrentSession } from "../api";
import { readAuthSession } from "../auth-session";

export function LogoutButton() {
  const navigate = useNavigate();
  const email = readAuthSession()?.user.email;

  async function logout() {
    await logoutCurrentSession();
    navigate("/login", { replace: true });
  }

  return (
    <Button onClick={() => void logout()} type="text">
      {email ? `Sign out (${email})` : "Sign out"}
    </Button>
  );
}
