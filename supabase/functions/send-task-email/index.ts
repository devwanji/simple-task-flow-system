
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5';
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface TaskEmailRequest {
  taskId: string;
  assignedToEmail: string;
  assignedToName: string;
  taskTitle: string;
  taskDescription?: string;
  deadline?: string;
  assignedByName: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      assignedToEmail, 
      assignedToName, 
      taskTitle, 
      taskDescription, 
      deadline, 
      assignedByName 
    }: TaskEmailRequest = await req.json();

    console.log("Sending task assignment email to:", assignedToEmail);

    const deadlineText = deadline 
      ? `<p><strong>Deadline:</strong> ${new Date(deadline).toLocaleDateString()}</p>` 
      : '';

    const emailResponse = await resend.emails.send({
      from: "Task Manager <onboarding@resend.dev>",
      to: [assignedToEmail],
      subject: `New Task Assigned: ${taskTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2563eb;">New Task Assigned</h1>
          <p>Hello ${assignedToName},</p>
          <p>You have been assigned a new task by ${assignedByName}.</p>
          
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="color: #1e293b; margin-top: 0;">${taskTitle}</h2>
            ${taskDescription ? `<p><strong>Description:</strong> ${taskDescription}</p>` : ''}
            ${deadlineText}
            <p><strong>Status:</strong> Pending</p>
          </div>
          
          <p>Please log in to your task manager to view more details and update the task status.</p>
          
          <p>Best regards,<br>Task Manager Team</p>
        </div>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-task-email function:", error);
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
