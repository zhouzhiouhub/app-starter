import { useState } from "react";
import { LockOutlined, MailOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Form, Input, Typography } from "antd";
import { useLocation, useNavigate } from "react-router-dom";
import { loginWithPassword } from "../../features/auth/api";
import { DEFAULT_ADMIN_EMAIL } from "../../features/auth/constants";

interface LoginFormValues {
  email: string;
  password: string;
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const from =
    (location.state as { from?: string } | null)?.from &&
    (location.state as { from?: string }).from !== "/login"
      ? (location.state as { from: string }).from
      : "/";

  async function submit(values: LoginFormValues) {
    setIsSubmitting(true);
    setError(null);

    try {
      await loginWithPassword({
        email: values.email,
        password: values.password,
      });
      navigate(from, { replace: true });
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Login failed.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      style={{
        alignItems: "center",
        background: "#f5f5f5",
        display: "flex",
        justifyContent: "center",
        minHeight: "100vh",
        padding: 24,
      }}
    >
      <Card style={{ width: 400 }}>
        <Typography.Title level={3} style={{ marginTop: 0 }}>
          Admin sign in
        </Typography.Title>
        <Typography.Paragraph type="secondary">
          Use the seeded tenant admin to manage pages. Default local account is{" "}
          {DEFAULT_ADMIN_EMAIL}. Sign in on this Admin page (port 5173). Do not
          open <Typography.Text code>/api/v1/auth/login</Typography.Text> in the
          browser — that path only accepts POST.
        </Typography.Paragraph>
        {error ? (
          <Alert
            showIcon
            style={{ marginBottom: 16 }}
            title={error}
            type="error"
          />
        ) : null}
        <Form<LoginFormValues>
          initialValues={{ email: DEFAULT_ADMIN_EMAIL }}
          layout="vertical"
          onFinish={(values) => void submit(values)}
          onSubmitCapture={(event) => {
            event.preventDefault();
          }}
        >
          <Form.Item
            label="Email"
            name="email"
            rules={[{ required: true, type: "email" }]}
          >
            <Input autoComplete="username" prefix={<MailOutlined />} />
          </Form.Item>
          <Form.Item
            label="Password"
            name="password"
            rules={[{ min: 8, required: true }]}
          >
            <Input.Password
              autoComplete="current-password"
              prefix={<LockOutlined />}
            />
          </Form.Item>
          <Button
            block
            htmlType="submit"
            loading={isSubmitting}
            type="primary"
          >
            Sign in
          </Button>
        </Form>
      </Card>
    </div>
  );
}
