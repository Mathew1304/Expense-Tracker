import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface EventInviteRequest {
  attendeeEmail: string;
  attendeeName?: string;
  eventTitle: string;
  eventDescription?: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  allDay: boolean;
  eventType: string;
  priority: string;
  organizerName: string;
  organizerEmail: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const body: EventInviteRequest = await req.json();

    const {
      attendeeEmail,
      attendeeName,
      eventTitle,
      eventDescription,
      startDate,
      endDate,
      startTime,
      endTime,
      location,
      allDay,
      eventType,
      priority,
      organizerName,
      organizerEmail,
    } = body;

    // Validate required fields
    if (!attendeeEmail || !eventTitle || !startDate || !endDate || !organizerEmail) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Format dates for display
    const formatDate = (dateStr: string): string => {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };

    const formatTime = (timeStr: string): string => {
      if (!timeStr) return '';
      const [hours, minutes] = timeStr.split(':');
      const date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes));
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    };

    // Get event type badge color
    const getEventTypeBadge = (type: string): { color: string; label: string } => {
      const types: Record<string, { color: string; label: string }> = {
        'meeting': { color: '#3B82F6', label: 'Meeting' },
        'site_visit': { color: '#10B981', label: 'Site Visit' },
        'inspection': { color: '#F97316', label: 'Inspection' },
        'deadline': { color: '#EF4444', label: 'Deadline' },
        'delivery': { color: '#8B5CF6', label: 'Delivery' },
        'other': { color: '#6B7280', label: 'Other' }
      };
      return types[type] || types['other'];
    };

    // Get priority badge
    const getPriorityBadge = (priority: string): { color: string; label: string } => {
      const priorities: Record<string, { color: string; label: string }> = {
        'high': { color: '#DC2626', label: 'High Priority' },
        'medium': { color: '#F59E0B', label: 'Medium Priority' },
        'low': { color: '#059669', label: 'Low Priority' }
      };
      return priorities[priority] || priorities['low'];
    };

    const eventTypeBadge = getEventTypeBadge(eventType);
    const priorityBadge = getPriorityBadge(priority);

    // Create email HTML
    const emailHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Event Invitation</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); border-radius: 8px; overflow: hidden;">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
                📅 Event Invitation
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">

              <!-- Greeting -->
              <p style="margin: 0 0 20px; font-size: 16px; color: #374151;">
                Hello ${attendeeName || attendeeEmail},
              </p>

              <p style="margin: 0 0 30px; font-size: 16px; color: #374151;">
                You have been invited to the following event by <strong>${organizerName}</strong>:
              </p>

              <!-- Event Card -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f9fafb; border-radius: 8px; border: 2px solid #e5e7eb; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 30px;">

                    <!-- Event Title -->
                    <h2 style="margin: 0 0 10px; font-size: 24px; color: #1f2937; font-weight: 600;">
                      ${eventTitle}
                    </h2>

                    <!-- Event Type & Priority Badges -->
                    <div style="margin-bottom: 20px;">
                      <span style="display: inline-block; padding: 6px 12px; background-color: ${eventTypeBadge.color}; color: #ffffff; border-radius: 6px; font-size: 12px; font-weight: 600; margin-right: 8px;">
                        ${eventTypeBadge.label}
                      </span>
                      <span style="display: inline-block; padding: 6px 12px; background-color: ${priorityBadge.color}; color: #ffffff; border-radius: 6px; font-size: 12px; font-weight: 600;">
                        ${priorityBadge.label}
                      </span>
                    </div>

                    ${eventDescription ? `
                    <!-- Description -->
                    <p style="margin: 0 0 20px; font-size: 15px; color: #4b5563; line-height: 1.6;">
                      ${eventDescription}
                    </p>
                    ` : ''}

                    <!-- Event Details -->
                    <table role="presentation" style="width: 100%; border-collapse: collapse; margin-top: 20px;">

                      <!-- Date -->
                      <tr>
                        <td style="padding: 12px 0; border-top: 1px solid #e5e7eb;">
                          <table role="presentation" style="width: 100%;">
                            <tr>
                              <td style="width: 30px; vertical-align: top;">
                                <span style="font-size: 20px;">📅</span>
                              </td>
                              <td style="vertical-align: top;">
                                <strong style="color: #1f2937; font-size: 14px;">Date:</strong><br>
                                <span style="color: #4b5563; font-size: 14px;">
                                  ${startDate === endDate ? formatDate(startDate) : `${formatDate(startDate)} - ${formatDate(endDate)}`}
                                </span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>

                      ${!allDay && startTime ? `
                      <!-- Time -->
                      <tr>
                        <td style="padding: 12px 0; border-top: 1px solid #e5e7eb;">
                          <table role="presentation" style="width: 100%;">
                            <tr>
                              <td style="width: 30px; vertical-align: top;">
                                <span style="font-size: 20px;">⏰</span>
                              </td>
                              <td style="vertical-align: top;">
                                <strong style="color: #1f2937; font-size: 14px;">Time:</strong><br>
                                <span style="color: #4b5563; font-size: 14px;">
                                  ${formatTime(startTime)}${endTime ? ` - ${formatTime(endTime)}` : ''}
                                </span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      ` : `
                      <!-- All Day Event -->
                      <tr>
                        <td style="padding: 12px 0; border-top: 1px solid #e5e7eb;">
                          <table role="presentation" style="width: 100%;">
                            <tr>
                              <td style="width: 30px; vertical-align: top;">
                                <span style="font-size: 20px;">⏰</span>
                              </td>
                              <td style="vertical-align: top;">
                                <strong style="color: #1f2937; font-size: 14px;">All Day Event</strong>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      `}

                      ${location ? `
                      <!-- Location -->
                      <tr>
                        <td style="padding: 12px 0; border-top: 1px solid #e5e7eb;">
                          <table role="presentation" style="width: 100%;">
                            <tr>
                              <td style="width: 30px; vertical-align: top;">
                                <span style="font-size: 20px;">📍</span>
                              </td>
                              <td style="vertical-align: top;">
                                <strong style="color: #1f2937; font-size: 14px;">Location:</strong><br>
                                <span style="color: #4b5563; font-size: 14px;">${location}</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      ` : ''}

                      <!-- Organizer -->
                      <tr>
                        <td style="padding: 12px 0; border-top: 1px solid #e5e7eb;">
                          <table role="presentation" style="width: 100%;">
                            <tr>
                              <td style="width: 30px; vertical-align: top;">
                                <span style="font-size: 20px;">👤</span>
                              </td>
                              <td style="vertical-align: top;">
                                <strong style="color: #1f2937; font-size: 14px;">Organizer:</strong><br>
                                <span style="color: #4b5563; font-size: 14px;">${organizerName}</span><br>
                                <a href="mailto:${organizerEmail}" style="color: #3b82f6; text-decoration: none; font-size: 14px;">${organizerEmail}</a>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>

                    </table>

                  </td>
                </tr>
              </table>

              <!-- Footer Message -->
              <p style="margin: 0 0 10px; font-size: 14px; color: #6b7280;">
                This is an automated notification. Please contact the organizer if you have any questions.
              </p>

              <p style="margin: 0; font-size: 14px; color: #6b7280;">
                Best regards,<br>
                <strong>Buildmyhomes</strong>
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                © ${new Date().getFullYear()} Buildmyhomes. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    // Send email via Resend
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `${organizerName} <no-reply@buildmyhomes.in>`,
        to: attendeeEmail,
        subject: `📅 Event Invitation: ${eventTitle}`,
        html: emailHTML,
        reply_to: organizerEmail,
      }),
    });

    if (!resendResponse.ok) {
      const errorData = await resendResponse.json();
      console.error("Resend API error:", errorData);
      throw new Error(`Failed to send email: ${errorData.message || resendResponse.statusText}`);
    }

    const data = await resendResponse.json();

    return new Response(
      JSON.stringify({
        success: true,
        message: "Event invitation sent successfully",
        emailId: data.id
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error: any) {
    console.error("Error sending calendar invite:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to send calendar invite",
        details: error.toString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});