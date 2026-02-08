import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

// Send email using Resend API directly (no npm dependency)
async function sendEmail(to: string, subject: string, html: string) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "RDAP WHOIS <noreply@x.rw>",
      to: [to],
      subject,
      html,
    }),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Resend API error: ${response.status} - ${errorText}`);
  }
  
  return await response.json();
}

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

// Professional email template with modern design matching app style
const getBaseStyles = () => `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { 
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Arial, sans-serif;
    background-color: #f8fafc;
    margin: 0;
    padding: 40px 20px;
    line-height: 1.6;
    color: #1a1a1a;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  .wrapper {
    max-width: 520px;
    margin: 0 auto;
  }
  .container {
    background: #ffffff;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04);
    border: 1px solid #e2e8f0;
  }
  .header {
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%);
    padding: 36px 32px;
    text-align: center;
    position: relative;
  }
  .header::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899);
  }
  .logo {
    font-size: 22px;
    font-weight: 700;
    color: #ffffff;
    letter-spacing: -0.5px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
  }
  .logo-icon {
    width: 36px;
    height: 36px;
    background: rgba(255,255,255,0.15);
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
  }
  .logo-text {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }
  .logo-main {
    font-size: 20px;
    font-weight: 700;
    letter-spacing: 1px;
  }
  .logo-sub {
    font-size: 10px;
    font-weight: 400;
    opacity: 0.7;
    letter-spacing: 0.5px;
    margin-top: 2px;
  }
  .content {
    padding: 40px 32px;
  }
  .greeting {
    font-size: 14px;
    color: #64748b;
    margin-bottom: 8px;
  }
  h1 {
    color: #0f172a;
    font-size: 24px;
    font-weight: 700;
    margin: 0 0 20px 0;
    letter-spacing: -0.5px;
    line-height: 1.3;
  }
  p {
    color: #475569;
    font-size: 15px;
    line-height: 1.7;
    margin: 0 0 16px 0;
  }
  .highlight-box {
    background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
    border: 1px solid #bae6fd;
    border-radius: 12px;
    padding: 20px 24px;
    margin: 24px 0;
  }
  .highlight-box p {
    color: #0369a1;
    font-size: 14px;
    margin: 0;
  }
  .button-container {
    text-align: center;
    margin: 28px 0;
  }
  .button {
    display: inline-block;
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
    color: #ffffff !important;
    text-decoration: none;
    padding: 16px 40px;
    border-radius: 10px;
    font-size: 15px;
    font-weight: 600;
    letter-spacing: 0.3px;
    box-shadow: 0 4px 14px rgba(15, 23, 42, 0.25);
    transition: all 0.2s ease;
  }
  .button:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(15, 23, 42, 0.35);
  }
  .link-fallback {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 14px 16px;
    margin: 20px 0;
  }
  .link-fallback p {
    font-size: 12px;
    color: #64748b;
    margin: 0 0 8px 0;
  }
  .link-fallback a {
    font-size: 11px;
    color: #3b82f6;
    word-break: break-all;
    text-decoration: none;
  }
  .divider {
    height: 1px;
    background: linear-gradient(90deg, transparent, #e2e8f0, transparent);
    margin: 28px 0;
  }
  .features {
    background: #fafafa;
    border-radius: 12px;
    padding: 20px 24px;
    margin: 24px 0;
  }
  .features-title {
    font-size: 13px;
    font-weight: 600;
    color: #374151;
    margin-bottom: 14px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .feature-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 0;
    border-bottom: 1px solid #e5e7eb;
  }
  .feature-item:last-child {
    border-bottom: none;
  }
  .feature-icon {
    width: 28px;
    height: 28px;
    background: #e0f2fe;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
  }
  .feature-text {
    font-size: 14px;
    color: #475569;
  }
  .warning-box {
    background: linear-gradient(135deg, #fefce8 0%, #fef9c3 100%);
    border: 1px solid #fde047;
    border-radius: 10px;
    padding: 16px 20px;
    margin: 20px 0;
    display: flex;
    align-items: flex-start;
    gap: 12px;
  }
  .warning-icon {
    font-size: 18px;
    flex-shrink: 0;
  }
  .warning-box p {
    color: #854d0e;
    font-size: 13px;
    margin: 0;
    line-height: 1.5;
  }
  .security-note {
    font-size: 12px;
    color: #94a3b8;
    text-align: center;
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px solid #f1f5f9;
  }
  .footer {
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    padding: 24px 32px;
    text-align: center;
    border-top: 1px solid #e2e8f0;
  }
  .footer-brand {
    font-size: 14px;
    font-weight: 600;
    color: #374151;
    margin-bottom: 8px;
  }
  .footer-links {
    margin-bottom: 12px;
  }
  .footer-links a {
    font-size: 12px;
    color: #64748b;
    text-decoration: none;
    margin: 0 8px;
  }
  .footer-links a:hover {
    color: #3b82f6;
  }
  .footer p {
    color: #94a3b8;
    font-size: 11px;
    margin: 0;
  }
  .copyright {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid #e2e8f0;
  }
`;

const getWelcomeEmail = (email: string, verifyLink?: string) => `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>欢迎加入 RDAP 域名查询</title>
  <style>${getBaseStyles()}</style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <div class="logo">
          <div class="logo-icon">🌐</div>
          <div class="logo-text">
            <span class="logo-main">RDAP WHOIS</span>
            <span class="logo-sub">Domain Lookup Tool</span>
          </div>
        </div>
      </div>
      <div class="content">
        <p class="greeting">尊敬的用户，</p>
        <h1>🎉 欢迎加入 RDAP 域名查询</h1>
        <p>感谢您注册我们的服务！RDAP 域名查询是一款专业、高效的域名信息查询工具，为您提供准确的 WHOIS 数据和域名注册信息。</p>
        
        ${verifyLink ? `
        <div class="highlight-box">
          <p>📧 请验证您的邮箱地址以激活账户并享受完整功能。</p>
        </div>
        
        <div class="button-container">
          <a href="${verifyLink}" class="button">✓ 验证邮箱地址</a>
        </div>
        
        <div class="warning-box">
          <span class="warning-icon">⏰</span>
          <p>此验证链接将在 <strong>24 小时</strong>后失效。如果按钮无法点击，请复制下方链接至浏览器地址栏。</p>
        </div>
        
        <div class="link-fallback">
          <p>备用链接：</p>
          <a href="${verifyLink}">${verifyLink}</a>
        </div>
        ` : `
        <p>您的账户已成功创建！现在可以开始使用所有功能：</p>
        
        <div class="features">
          <div class="features-title">核心功能</div>
          <div class="feature-item">
            <div class="feature-icon">🔍</div>
            <span class="feature-text">RDAP/WHOIS 域名信息查询</span>
          </div>
          <div class="feature-item">
            <div class="feature-icon">📋</div>
            <span class="feature-text">保存查询历史记录</span>
          </div>
          <div class="feature-item">
            <div class="feature-icon">⭐</div>
            <span class="feature-text">收藏感兴趣的域名</span>
          </div>
          <div class="feature-item">
            <div class="feature-icon">🔗</div>
            <span class="feature-text">一键分享查询结果</span>
          </div>
        </div>
        
        <div class="button-container">
          <a href="https://rdap.x.rw" class="button">开始使用 →</a>
        </div>
        `}
        
        <div class="divider"></div>
        <p class="security-note">🔒 如果这不是您的操作，请忽略此邮件，您的账户安全不会受到影响。</p>
      </div>
      <div class="footer">
        <div class="footer-brand">RDAP 域名查询</div>
        <div class="footer-links">
          <a href="https://rdap.x.rw">访问网站</a>
          <a href="https://hello.sn">关于我们</a>
          <a href="https://0451.me">域名注册</a>
        </div>
        <p>专业的域名 WHOIS 信息查询工具</p>
        <div class="copyright">
          <p>© 2026 x.rw · All Rights Reserved</p>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
`;

const getPasswordResetEmail = (resetLink: string) => `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>重置密码 - RDAP 域名查询</title>
  <style>${getBaseStyles()}</style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <div class="logo">
          <div class="logo-icon">🔐</div>
          <div class="logo-text">
            <span class="logo-main">RDAP WHOIS</span>
            <span class="logo-sub">Password Recovery</span>
          </div>
        </div>
      </div>
      <div class="content">
        <p class="greeting">尊敬的用户，</p>
        <h1>🔐 重置您的账户密码</h1>
        <p>我们收到了重置您账户密码的请求。如果这是您本人操作，请点击下方按钮设置新密码。</p>
        
        <div class="button-container">
          <a href="${resetLink}" class="button">🔑 重置我的密码</a>
        </div>
        
        <div class="warning-box">
          <span class="warning-icon">⏰</span>
          <p>为了账户安全，此链接将在 <strong>1 小时</strong>后失效。请尽快完成密码重置。</p>
        </div>
        
        <div class="link-fallback">
          <p>如果按钮无法点击，请复制以下链接到浏览器：</p>
          <a href="${resetLink}">${resetLink}</a>
        </div>
        
        <div class="highlight-box">
          <p>💡 <strong>安全提示：</strong>建议使用包含大小写字母、数字和特殊字符的强密码，长度至少8位。</p>
        </div>
        
        <div class="divider"></div>
        <p class="security-note">🔒 如果您没有请求重置密码，请忽略此邮件。您的账户密码不会被更改，安全不会受到影响。</p>
      </div>
      <div class="footer">
        <div class="footer-brand">RDAP 域名查询</div>
        <div class="footer-links">
          <a href="https://rdap.x.rw">访问网站</a>
          <a href="https://hello.sn">关于我们</a>
          <a href="https://0451.me">域名注册</a>
        </div>
        <p>专业的域名 WHOIS 信息查询工具</p>
        <div class="copyright">
          <p>© 2026 x.rw · All Rights Reserved</p>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
`;

const getEmailVerificationEmail = (verifyLink: string) => `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>验证邮箱 - RDAP 域名查询</title>
  <style>${getBaseStyles()}</style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <div class="logo">
          <div class="logo-icon">✉️</div>
          <div class="logo-text">
            <span class="logo-main">RDAP WHOIS</span>
            <span class="logo-sub">Email Verification</span>
          </div>
        </div>
      </div>
      <div class="content">
        <p class="greeting">尊敬的用户，</p>
        <h1>✉️ 验证您的邮箱地址</h1>
        <p>感谢您注册 RDAP 域名查询！请验证您的邮箱地址以完成注册流程并激活您的账户。</p>
        
        <div class="highlight-box">
          <p>📧 验证后，您将可以使用所有功能，包括保存查询记录和收藏域名。</p>
        </div>
        
        <div class="button-container">
          <a href="${verifyLink}" class="button">✓ 立即验证邮箱</a>
        </div>
        
        <div class="warning-box">
          <span class="warning-icon">⏰</span>
          <p>此验证链接将在 <strong>24 小时</strong>后失效。请尽快完成验证以免链接过期。</p>
        </div>
        
        <div class="link-fallback">
          <p>如果按钮无法点击，请复制以下链接到浏览器：</p>
          <a href="${verifyLink}">${verifyLink}</a>
        </div>
        
        <div class="divider"></div>
        <p class="security-note">🔒 如果这不是您的操作，请忽略此邮件。</p>
      </div>
      <div class="footer">
        <div class="footer-brand">RDAP 域名查询</div>
        <div class="footer-links">
          <a href="https://rdap.x.rw">访问网站</a>
          <a href="https://hello.sn">关于我们</a>
          <a href="https://0451.me">域名注册</a>
        </div>
        <p>专业的域名 WHOIS 信息查询工具</p>
        <div class="copyright">
          <p>© 2026 x.rw · All Rights Reserved</p>
        </div>
      </div>
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
        subject = "🎉 欢迎加入 RDAP 域名查询 | Welcome to RDAP WHOIS";
        html = getWelcomeEmail(email, verifyLink);
        break;
      case "password_reset":
        if (!resetLink) {
          throw new Error("Missing resetLink for password_reset email");
        }
        subject = "🔐 重置您的密码 | Reset Your Password - RDAP WHOIS";
        html = getPasswordResetEmail(resetLink);
        break;
      case "email_verification":
        if (!verifyLink) {
          throw new Error("Missing verifyLink for email_verification email");
        }
        subject = "✉️ 验证您的邮箱 | Verify Your Email - RDAP WHOIS";
        html = getEmailVerificationEmail(verifyLink);
        break;
      default:
        throw new Error(`Unknown email type: ${type}`);
    }

    const emailResponse = await sendEmail(email, subject, html);

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
