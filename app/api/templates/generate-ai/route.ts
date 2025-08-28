import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { prompt, type } = await request.json()
    
    if (!prompt || !type) {
      return NextResponse.json(
        { error: 'Prompt and type are required' },
        { status: 400 }
      )
    }

    // Simulate AI generation with a delay for better UX
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    let generatedContent = ''
    let generatedSubject = ''
    
    if (type === 'Newsletter') {
      generatedSubject = `${prompt} - Monthly Newsletter`
      generatedContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${generatedSubject}</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333333;
            background-color: #f8f9fa;
        }
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 40px 30px;
            text-align: center;
        }
        .header h1 {
            color: white;
            margin: 0;
            font-size: 28px;
            font-weight: 700;
        }
        .content {
            padding: 40px 30px;
        }
        .greeting {
            font-size: 16px;
            margin-bottom: 30px;
            color: #666666;
        }
        h2 {
            font-size: 22px;
            font-weight: 600;
            color: #1a1a1a;
            margin: 40px 0 20px 0;
        }
        p {
            font-size: 16px;
            margin: 0 0 20px 0;
            color: #555555;
        }
        .cta-button {
            display: inline-block;
            background-color: #667eea;
            color: #ffffff;
            text-decoration: none;
            padding: 12px 24px;
            border-radius: 6px;
            font-weight: 600;
            font-size: 16px;
            margin: 20px 0;
        }
        .footer {
            background-color: #f8f9fa;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e9ecef;
            font-size: 14px;
            color: #666666;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <h1>${prompt}</h1>
        </div>
        
        <div class="content">
            <div class="greeting">
                Hi {{first_name}},
            </div>
            
            <h2>What's New This Month</h2>
            
            <p>We're excited to share the latest updates and insights with you. This month has been packed with new developments and we can't wait to tell you all about them.</p>
            
            <p>Here are some highlights:</p>
            <ul>
                <li>New features and improvements</li>
                <li>Community updates and success stories</li>
                <li>Upcoming events and opportunities</li>
            </ul>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="#" class="cta-button">Read More</a>
            </div>
            
            <p>Thank you for being part of our community. We look forward to sharing more exciting updates with you soon!</p>
        </div>
        
        <div class="footer">
            <p>Best regards,<br>Your Team</p>
            <p>
                <a href="#">Website</a> | 
                <a href="#">Unsubscribe</a>
            </p>
        </div>
    </div>
</body>
</html>`
    } else if (type === 'Welcome Email') {
      generatedSubject = `Welcome to ${prompt}! 🎉`
      generatedContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${generatedSubject}</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333333;
            background-color: #f8f9fa;
        }
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 40px 30px;
            text-align: center;
        }
        .header h1 {
            color: white;
            margin: 0;
            font-size: 28px;
            font-weight: 700;
        }
        .content {
            padding: 40px 30px;
        }
        .greeting {
            font-size: 18px;
            margin-bottom: 30px;
            color: #1a1a1a;
            font-weight: 600;
        }
        p {
            font-size: 16px;
            margin: 0 0 20px 0;
            color: #555555;
        }
        .cta-button {
            display: inline-block;
            background-color: #667eea;
            color: #ffffff;
            text-decoration: none;
            padding: 15px 30px;
            border-radius: 6px;
            font-weight: 600;
            font-size: 16px;
            margin: 20px 0;
        }
        .footer {
            background-color: #f8f9fa;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e9ecef;
            font-size: 14px;
            color: #666666;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <h1>Welcome Aboard! 🎉</h1>
        </div>
        
        <div class="content">
            <div class="greeting">
                Hi {{first_name}},
            </div>
            
            <p>Welcome to ${prompt}! We're thrilled to have you join our community.</p>
            
            <p>You've just taken the first step towards an amazing journey with us. Here's what you can expect:</p>
            
            <ul>
                <li>Regular updates and valuable insights</li>
                <li>Exclusive content and special offers</li>
                <li>Access to our supportive community</li>
            </ul>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="#" class="cta-button">Get Started</a>
            </div>
            
            <p>If you have any questions, don't hesitate to reach out. We're here to help!</p>
        </div>
        
        <div class="footer">
            <p>Best regards,<br>The ${prompt} Team</p>
            <p>
                <a href="#">Contact Us</a> | 
                <a href="#">Help Center</a>
            </p>
        </div>
    </div>
</body>
</html>`
    } else {
      generatedSubject = `${prompt} - Special Update`
      generatedContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${generatedSubject}</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333333;
            background-color: #f8f9fa;
        }
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .content {
            padding: 40px 30px;
        }
        h1 {
            font-size: 28px;
            font-weight: 700;
            color: #1a1a1a;
            margin: 0 0 20px 0;
        }
        .greeting {
            font-size: 16px;
            margin-bottom: 30px;
            color: #666666;
        }
        p {
            font-size: 16px;
            margin: 0 0 20px 0;
            color: #555555;
        }
        .cta-button {
            display: inline-block;
            background-color: #007bff;
            color: #ffffff;
            text-decoration: none;
            padding: 12px 24px;
            border-radius: 6px;
            font-weight: 600;
            font-size: 16px;
            margin: 20px 0;
        }
        .footer {
            background-color: #f8f9fa;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e9ecef;
            font-size: 14px;
            color: #666666;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="content">
            <div class="greeting">
                Hi {{first_name}},
            </div>
            
            <h1>${prompt}</h1>
            
            <p>We have some exciting news to share with you today!</p>
            
            <p>This update brings new features and improvements that we think you'll love. We've been working hard to make your experience even better.</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="#" class="cta-button">Learn More</a>
            </div>
            
            <p>Thank you for your continued support. We can't wait for you to try out these new features!</p>
        </div>
        
        <div class="footer">
            <p>Best regards,<br>Your Team</p>
            <p>
                <a href="#">Website</a> | 
                <a href="#">Support</a>
            </p>
        </div>
    </div>
</body>
</html>`
    }
    
    return NextResponse.json({
      success: true,
      data: {
        subject: generatedSubject,
        content: generatedContent
      }
    })
  } catch (error) {
    console.error('Error generating AI content:', error)
    return NextResponse.json(
      { error: 'Failed to generate AI content' },
      { status: 500 }
    )
  }
}