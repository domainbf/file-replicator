import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY") as string);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface EmailRequest {
  type: "welcome" | "password_reset" | "email_verification";
  email: string;
  resetLink?: string;
  verifyLink?: string;
}

// Minimalist, professional email template style matching the app
const getBaseStyles = () => `
  body { 
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', sans-serif;
    background-color: #f5f5f5;
    margin: 0;
    padding: 40px 20px;
  }
  .container {
    max-width: 480px;
    margin: 0 auto;
    background: #ffffff;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  }
  .header {
    background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
    padding: 32px 24px;
    text-align: center;
  }
  .logo {
    font-size: 24px;
    font-weight: 700;
    color: #ffffff;
    letter-spacing: -0.5px;
  }
  .content {
    padding: 32px 24px;
  }
  h1 {
    color: #1a1a1a;
    font-size: 20px;
    font-weight: 600;
    margin: 0 0 16px 0;
    letter-spacing: -0.3px;
  }
  p {
    color: #666666;
    font-size: 14px;
    line-height: 1.6;
    margin: 0 0 16px 0;
  }
  .button {
    display: inline-block;
    background: #1a1a1a;
    color: #ffffff !important;
    text-decoration: none;
    padding: 14px 28px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    margin: 8px 0 24px 0;
    transition: background 0.2s;
  }
  .button:hover {
    background: #333333;
  }
  .divider {
    height: 1px;
    background: #e5e5e5;
    margin: 24px 0;
  }
  .code-box {
    background: #f5f5f5;
    border: 1px solid #e5e5e5;
    border-radius: 8px;
    padding: 16px;
    text-align: center;
    margin: 16px 0;
  }
  .code {
    font-family: 'SF Mono', Monaco, monospace;
    font-size: 24px;
    font-weight: 700;
    color: #1a1a1a;
    letter-spacing: 4px;
  }
  .footer {
    background: #fafafa;
    padding: 20px 24px;
    text-align: center;
    border-top: 1px solid #e5e5e5;
  }
  .footer p {
    color: #999999;
    font-size: 12px;
    margin: 0;
  }
  .footer a {
    color: #666666;
    text-decoration: none;
  }
  .warning {
    background: #fffbeb;
    border: 1px solid #fef3c7;
    border-radius: 8px;
    padding: 12px 16px;
    margin: 16px 0;
  }
  .warning p {
    color: #92400e;
    font-size: 12px;
    margin: 0;
  }
`;

const getWelcomeEmail = (email: string, verifyLink?: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>欢迎加入</title>
  <style>${getBaseStyles()}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">🌐 RDAP 域名查询</div>
    </div>
    <div class="content">
      <h1>欢迎加入！</h1>
      <p>您好，</p>
      <p>感谢您注册 RDAP 域名查询工具。我们致力于为您提供专业、高效的域名信息查询服务。</p>
      ${verifyLink ? `
      <p>请点击下方按钮验证您的邮箱地址：</p>
      <a href="${verifyLink}" class="button">验证邮箱</a>
      <div class="warning">
        <p>⏰ 此链接将在 24 小时后失效。如果按钮无法点击，请复制以下链接到浏览器：</p>
      </div>
      <p style="word-break: break-all; font-size: 12px; color: #999;">${verifyLink}</p>
      ` : `
      <p>您的账户已成功创建，现在可以开始使用所有功能：</p>
      <ul style="color: #666; font-size: 14px; line-height: 1.8; padding-left: 20px;">
        <li>保存域名查询历史</li>
        <li>收藏感兴趣的域名</li>
        <li>一键分享查询结果</li>
      </ul>
      <a href="https://rdap.x.rw" class="button">开始使用</a>
      `}
      <div class="divider"></div>
      <p style="font-size: 12px; color: #999;">如果这不是您的操作，请忽略此邮件。</p>
    </div>
    <div class="footer">
      <p>© 2026 RDAP Domain Lookup · <a href="https://rdap.x.rw">rdap.x.rw</a></p>
    </div>
  </div>
</body>
</html>
`;

const getPasswordResetEmail = (resetLink: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>重置密码</title>
  <style>${getBaseStyles()}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">🌐 RDAP 域名查询</div>
    </div>
    <div class="content">
      <h1>重置您的密码</h1>
      <p>您好，</p>
      <p>我们收到了重置您账户密码的请求。点击下方按钮设置新密码：</p>
      <a href="${resetLink}" class="button">重置密码</a>
      <div class="warning">
        <p>⏰ 此链接将在 1 小时后失效。如果按钮无法点击，请复制以下链接到浏览器：</p>
      </div>
      <p style="word-break: break-all; font-size: 12px; color: #999;">${resetLink}</p>
      <div class="divider"></div>
      <p style="font-size: 12px; color: #999;">如果您没有请求重置密码，请忽略此邮件。您的账户安全不会受到影响。</p>
    </div>
    <div class="footer">
      <p>© 2026 RDAP Domain Lookup · <a href="https://rdap.x.rw">rdap.x.rw</a></p>
    </div>
  </div>
</body>
</html>
`;

const getEmailVerificationEmail = (verifyLink: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>验证邮箱</title>
  <style>${getBaseStyles()}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">🌐 RDAP 域名查询</div>
    </div>
    <div class="content">
      <h1>验证您的邮箱</h1>
      <p>您好，</p>
      <p>请点击下方按钮验证您的邮箱地址，完成注册流程：</p>
      <a href="${verifyLink}" class="button">验证邮箱</a>
      <div class="warning">
        <p>⏰ 此链接将在 24 小时后失效。如果按钮无法点击，请复制以下链接到浏览器：</p>
      </div>
      <p style="word-break: break-all; font-size: 12px; color: #999;">${verifyLink}</p>
      <div class="divider"></div>
      <p style="font-size: 12px; color: #999;">如果这不是您的操作，请忽略此邮件。</p>
    </div>
    <div class="footer">
      <p>© 2026 RDAP Domain Lookup · <a href="https://rdap.x.rw">rdap.x.rw</a></p>
    </div>
  </div>
</body>
</html>
`;

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, email, resetLink, verifyLink }: EmailRequest = await req.json();

    console.log(`Processing ${type} email for ${email}`);

    // Validate required fields
    if (!email || !type) {
      throw new Error("Missing required fields: email and type are required");
    }

    let html: string;
    let subject: string;

    switch (type) {
      case "welcome":
        subject = "🎉 欢迎加入 RDAP 域名查询";
        html = getWelcomeEmail(email, verifyLink);
        break;
      case "password_reset":
        if (!resetLink) {
          throw new Error("Missing resetLink for password_reset email");
        }
        subject = "🔐 重置您的密码 - RDAP 域名查询";
        html = getPasswordResetEmail(resetLink);
        break;
      case "email_verification":
        if (!verifyLink) {
          throw new Error("Missing verifyLink for email_verification email");
        }
        subject = "✉️ 验证您的邮箱 - RDAP 域名查询";
        html = getEmailVerificationEmail(verifyLink);
        break;
      default:
        throw new Error(`Unknown email type: ${type}`);
    }

    const emailResponse = await resend.emails.send({
      from: "RDAP 域名查询 <noreply@x.rw>",
      to: [email],
      subject,
      html,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, id: emailResponse.id }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-auth-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
