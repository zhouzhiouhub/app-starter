import {
  AppstoreOutlined,
  FileTextOutlined,
  GlobalOutlined,
  PictureOutlined,
  SettingOutlined
} from "@ant-design/icons";
import { ConfigProvider, Layout, Menu, Tag, Typography } from "antd";
import { adminTheme } from "@app-starter/admin-theme";
import { customAdminRoutes } from "@app-starter/custom-admin";

const { Header, Content, Sider } = Layout;

export function App() {
  const items = [
    { key: "dashboard", icon: <AppstoreOutlined />, label: "Dashboard" },
    { key: "pages", icon: <FileTextOutlined />, label: "Pages" },
    { key: "media", icon: <PictureOutlined />, label: "Media" },
    { key: "localization", icon: <GlobalOutlined />, label: "Localization" },
    { key: "settings", icon: <SettingOutlined />, label: "Settings" }
  ];

  return (
    <ConfigProvider theme={adminTheme}>
      <Layout style={{ minHeight: "100vh" }}>
        <Sider width={240}>
          <div style={{ color: "white", fontWeight: 700, padding: 20 }}>
            App Starter
          </div>
          <Menu items={items} mode="inline" theme="dark" />
        </Sider>
        <Layout>
          <Header style={{ background: "#fff", borderBottom: "1px solid #eee" }}>
            <Typography.Text strong>Engineering Scaffold</Typography.Text>
          </Header>
          <Content style={{ padding: 24 }}>
            <Typography.Title level={3}>Phase 1 Admin Shell</Typography.Title>
            <Typography.Paragraph>
              MVP modules are visible for buildout. Commerce is reserved and
              remains disabled by default.
            </Typography.Paragraph>
            <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
              <Tag color="blue">DEFAULT_LOCALE=en-US</Tag>
              <Tag color="default">COMMERCE_ENABLED=false</Tag>
              <Tag color="default">MULTI_LOCALE_ENABLED=false</Tag>
            </div>
            <Typography.Title level={4}>Custom admin routes</Typography.Title>
            <pre>{JSON.stringify(customAdminRoutes, null, 2)}</pre>
          </Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
}
