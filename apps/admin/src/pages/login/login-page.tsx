import { useState } from "react";
import { LockOutlined, MailOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Form, Input, Typography } from "antd";
import { useLocation, useNavigate } from "react-router-dom";
import { loginWithPassword } from "../../features/auth/api";
import { readAdminLoginHint } from "../../features/auth/login-hint";

interface LoginFormValues {
  email: string;
  password: string;
}

function loginErrorMessage(caught: unknown): string {
  if (caught instanceof TypeError && caught.message === "Failed to fetch") {
    return "Cannot reach the API. Wait until the API service has started, then try again.";
  }

  return caught instanceof Error ? caught.message : "Login failed.";
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const loginHint = readAdminLoginHint(import.meta.env);
  const from =
    (location.state as { from?: string } | null)?.from &&
    (location.state as { from?: string }).from !== "/login"
      ? (location.state as { from: string }).from
      : "/pages";

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
      setError(loginErrorMessage(caught));
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
          {loginHint.description}
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
          <Button block htmlType="submit" loading={isSubmitting} type="primary">
            Sign in
          </Button>
        </Form>
      </Card>
    </div>
  );
}
