import {
  AuditOutlined,
  AppstoreOutlined,
  FileTextOutlined,
  GlobalOutlined,
  PictureOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { Layout, Menu, Typography } from "antd";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { LogoutButton } from "../auth/components/logout-button";
import {
  adminHeaderTitle,
  adminMenuItems,
  selectedAdminMenuKey,
} from "./constants";

const { Content, Header, Sider } = Layout;

const menuIcons = {
  "/": <AppstoreOutlined />,
  "/audit-logs": <AuditOutlined />,
  "/localization": <GlobalOutlined />,
  "/media": <PictureOutlined />,
  "/pages": <FileTextOutlined />,
  "/settings": <SettingOutlined />,
} as const;

export function AdminShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const selectedKey = selectedAdminMenuKey(location.pathname);

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider width={240}>
        <div style={{ color: "white", fontWeight: 700, padding: 20 }}>
          App Starter
        </div>
        <Menu
          items={adminMenuItems.map((item) => ({
            icon: menuIcons[item.key],
            key: item.key,
            label: item.label,
          }))}
          mode="inline"
          onClick={({ key }) => navigate(key)}
          selectedKeys={[selectedKey]}
          theme="dark"
        />
      </Sider>
      <Layout>
        <Header
          style={{
            alignItems: "center",
            background: "#fff",
            borderBottom: "1px solid #eee",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <Typography.Text strong>
            {adminHeaderTitle(location.pathname)}
          </Typography.Text>
          <LogoutButton />
        </Header>
        <Content style={{ padding: 24 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
