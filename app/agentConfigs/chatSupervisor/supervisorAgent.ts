import { RealtimeItem, tool } from '@openai/agents/realtime';
import { updateEmployeeStatus } from '@/app/lib/firebase';
import { reportSick, calculateSickLeaveStats, parseDateRange, updateChartData } from '@/app/lib/sickLogUtils';

import {
  exampleAccountInfo,
  examplePolicyDocs,
  exampleStoreLocations,
} from './sampleData';

export const supervisorAgentInstructions = `Du bist der BackOffice Spezialist im HR Bereich der NEA. Aktuell ist einer deiner Front-Desk Agenten im direkten Telefonkontakt mit einem weiteren Angestellten.
Du musst deinen Front-Desk Agenten mit folgenden Tools helfen:

WICHTIGE DATUMSPARSING-REGELN:
- Wenn jemand "heute" sagt, verwende das aktuelle Datum (${new Date().toISOString().split('T')[0]})
- Wenn jemand "morgen" sagt, verwende das morgige Datum
- Wenn jemand "in einer Woche" oder "nächste Woche" sagt, rechne 7 Tage zum aktuellen Datum
- Wenn jemand "in 2 Wochen" sagt, rechne 14 Tage zum aktuellen Datum
- Wenn jemand "nächsten Montag" sagt, finde den nächsten Montag
- Konvertiere alle relativen Datenangaben in ISO-Format (YYYY-MM-DD)
- Verwende IMMER das aktuelle Jahr, es sei denn, es wird explizit ein anderes Jahr genannt

Wenn der Mitarbeiter eine Krankmeldung einreichen möchte, muss dir der Front-Desk Agent folgende Informationen übermitteln:
Voller Name, Krankheitsgrund, Voraussichtliche Dauer, optional weitere Infos
Sobald alle erforderlichen Daten an dich gegeben wurden rufe IMMER diese beiden Tools aus:
reportEmployeeSick, um die Krankmeldung in der Datenbank abzuspeichern
Gleichzeitig das sendEmail Tool um deinen Vorgesetzten darüber zu informieren (type="sick").

Wenn der Mitarbeiter Urlaub einreichen möchte, muss dir der Front-Desk Agent folgende Informationen übermitteln:
Voller Name, Urlaubsgrund, Start- und Enddatum, optional weitere Infos
BEACHTE: Bei relativen Datumsangaben wie "heute bis in einer Woche" konvertiere diese in konkrete ISO-Daten.
Sobald alle erforderlichen Daten an dich gegeben wurden rufe IMMER diese beiden Tools aus:
reportEmployeeVacation, um den Urlaub in der Datenbank abzuspeichern
Gleichzeitig das sendEmail Tool um deinen Vorgesetzten darüber zu informieren (type="vacation").

Wenn der Front-Desk Agent nach Statistiken fragt, kannst du Krankenstatistiken mit dem getSickLeaveStats Tool im Dashboard anzeigen lassen`;

export const supervisorAgentTools = [
  {
    type: "function",
    name: "lookupPolicyDocument",
    description:
      "Tool zum Nachschlagen interner Dokumente und Richtlinien nach Thema oder Schlüsselwort.",
    parameters: {
      type: "object",
      properties: {
        topic: {
          type: "string",
          description:
            "Das Thema oder Schlüsselwort, nach dem in Unternehmensrichtlinien oder Dokumenten gesucht werden soll.",
        },
      },
      required: ["topic"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "getUserAccountInfo",
    description:
      "Tool zum Abrufen von Mitarbeiterinformationen. Dies liest nur Mitarbeiterinformationen und bietet keine Möglichkeit, Werte zu ändern oder zu löschen.",
    parameters: {
      type: "object",
      properties: {
        phone_number: {
          type: "string",
          description:
            "Formatiert als '(xxx) xxx-xxxx'. MUSS vom Mitarbeiter angegeben werden, niemals ein Null- oder leerer String.",
        },
      },
      required: ["phone_number"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "findNearestStore",
    description:
      "Tool zum Finden des nächstgelegenen Standorts anhand einer Postleitzahl.",
    parameters: {
      type: "object",
      properties: {
        zip_code: {
          type: "string",
          description: "Die 5-stellige Postleitzahl des Mitarbeiters.",
        },
      },
      required: ["zip_code"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "updateEmployeeKrankStatus",
    description:
      "Tool zum Aktualisieren des Krankheitsstatus eines Mitarbeiters mit Grund und Zeitpunkt.",
    parameters: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Der vollständige Name des Mitarbeiters (z.B. 'Julia Schäfer').",
        },
        isKrank: {
          type: "boolean",
          description: "Der neue Krankheitsstatus (true = krank, false = nicht krank).",
        },
        reason: {
          type: "string",
          description: "Der Grund für die Abwesenheit (z.B. 'Grippe', 'Arzttermin').",
        },
        reportedAt: {
          type: "string",
          description: "Der Zeitpunkt der Krankmeldung (ISO-String). Wenn nicht angegeben, wird der aktuelle Zeitpunkt verwendet.",
        },
      },
      required: ["name", "isKrank"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "reportEmployeeSick",
    description:
      "Tool zum Melden einer Krankmeldung eines Mitarbeiters. Dies erstellt einen neuen Eintrag in der Krankmeldungen-Sammlung.",
    parameters: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Der vollständige Name des Mitarbeiters (z.B. 'Julia Schäfer').",
        },
        reason: {
          type: "string",
          description: "Der Grund für die Abwesenheit (z.B. 'Grippe', 'Arzttermin').",
        }
      },
      required: ["name"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "reportEmployeeVacation",
    description:
      "Tool zum Melden eines Urlaubs eines Mitarbeiters. Dies erstellt einen neuen Eintrag in der Urlaubs-Sammlung.",
    parameters: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Der vollständige Name des Mitarbeiters (z.B. 'Julia Schäfer').",
        },
        reason: {
          type: "string",
          description: "Der Grund für den Urlaub (z.B. 'Erholung', 'Familienfeier').",
        },
        startDate: {
          type: "string",
          description: "Startdatum des Urlaubs (ISO-String).",
        },
        endDate: {
          type: "string",
          description: "Enddatum des Urlaubs (ISO-String).",
        },
        additionalNotes: {
          type: "string",
          description: "Weitere Informationen zum Urlaub (optional).",
        }
      },
      required: ["name", "startDate", "endDate"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "sendEmail",
    description: "Sendet eine Benachrichtigung an HR über Krankheit oder Urlaub.",
    parameters: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: ["sick", "vacation"],
          description: "Art der Meldung (Krankheit oder Urlaub)",
        },
        name: {
          type: "string",
          description: "Name des Mitarbeiters",
        },
        reason: {
          type: "string", 
          description: "Grund der Abwesenheit (Krankheit oder Urlaub)",
        },
        expectedDuration: {
          type: "string",
          description: "Voraussichtliche Dauer (nur für Krankheit)",
        },
        startDate: {
          type: "string",
          description: "Startdatum (nur für Urlaub)",
        },
        endDate: {
          type: "string",
          description: "Enddatum (nur für Urlaub)",
        },
        additionalNotes: {
          type: "string",
          description: "Weitere Informationen",
        }
      },
      required: ["type", "name"],
      additionalProperties: false,
    }
  },
  {
    type: "function",
    name: "getSickLeaveStats",
    description:
      "Tool zum Abrufen von Krankmeldungsstatistiken für einen bestimmten Zeitraum. Zeigt die Anzahl der Krankmeldungen pro Tag/Woche/Monat an.",
    parameters: {
      type: "object",
      properties: {
        period: {
          type: "string",
          description: "Der Zeitraum für die Statistik (z.B. 'August 2025')",
        },
        groupBy: {
          type: "string",
          enum: ["day", "week", "month"],
          description: "Wie die Daten gruppiert werden sollen",
        },
      },
      required: ["period", "groupBy"],
    },
    async function(params: { period: string; groupBy: 'day' | 'week' | 'month' }) {
      try {
        console.log('getSickLeaveStats called with:', {
          period: params.period,
          groupBy: params.groupBy,
          rawInput: params
        });
        
        const { startDate, endDate } = parseDateRange(params.period);
        console.log('Successfully parsed date range:', {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        });
        
        const stats = await calculateSickLeaveStats(startDate, endDate, params.groupBy);
        console.log('Retrieved stats:', stats);
        
        if (!stats || stats.length === 0) {
          return {
            message: `Für den Zeitraum ${params.period} liegen keine Krankmeldungen vor. Bitte wählen Sie einen anderen Zeitraum oder prüfen Sie, ob die Daten korrekt erfasst wurden.`,
            stats: []
          };
        }
        
        // Update the chart data using the event emitter
        updateChartData(stats, `Anzahl der Krankmeldungen für ${params.period}`);

        // Format stats data for the response message
        const statsDetails = stats.map(stat => `${stat.name}: ${stat.value} Krankmeldungen`).join('\n');
        
        return {
          message: `Ich habe die Krankmeldungsstatistik für ${params.period} im Statistik-Panel angezeigt.\n\nHier sind die Details:\n${statsDetails}`,
          stats: stats
        };
      } catch (error: any) {
        console.error('Error getting sick leave stats:', {
          error: error.message,
          input: params.period,
          stack: error.stack
        });
        
        // Provide a more user-friendly error message
        let errorMessage = 'Es ist ein Fehler bei der Abfrage der Krankmeldungen aufgetreten. ';
        if (error.message.includes('Ungültiges Datumsformat')) {
          errorMessage += error.message;
        } else {
          errorMessage += 'Bitte versuchen Sie es später erneut oder wenden Sie sich an den Support.';
        }
        
        return {
          message: errorMessage,
          stats: []
        };
      }
    },
  },
];

async function fetchResponsesMessage(body: any) {
  const response = await fetch('/api/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    // Preserve the previous behaviour of forcing sequential tool calls.
    body: JSON.stringify({ ...body, parallel_tool_calls: false }),
  });

  if (!response.ok) {
    console.warn('Server returned an error:', response);
    return { error: 'Something went wrong.' };
  }

  const completion = await response.json();
  return completion;
}

function getToolResponse(fName: string, params: any) {
  switch (fName) {
    case "getUserAccountInfo":
      return exampleAccountInfo;
    case "lookupPolicyDocument":
      return examplePolicyDocs;
    case "findNearestStore":
      return exampleStoreLocations;
    case "updateEmployeeKrankStatus":
      return updateEmployeeStatus(params.name, {
        isKrank: params.isKrank,
        reason: params.reason,
        reportedAt: params.reportedAt
      });
    case "reportEmployeeSick":
      return reportSick(params.name, params.reason);
    case "reportEmployeeVacation":
      // You need to implement this function in your vacation utils
      // Example: return reportVacation(params.name, params.reason, params.startDate, params.endDate, params.additionalNotes);
      return { success: true, message: "Urlaub wurde eingetragen (Demo)." };
    case "sendEmail": {
      // Generalized email sending for sick and vacation
      const { type, name, reason, expectedDuration, startDate, endDate, additionalNotes } = params;
      let subject = "";
      let body = "";
      if (type === "sick") {
        subject = `Krankmeldung: ${name}`;
        body = generateSickEmailBody({ name, reason, expectedDuration, additionalNotes });
      } else if (type === "vacation") {
        subject = `Urlaubsantrag: ${name}`;
        body = generateVacationEmailBody({ name, reason, startDate, endDate, additionalNotes });
      } else {
        return { error: "Unbekannter Typ für sendEmail." };
      }
      fetch('/api/send-test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ subject, body })
      });
      return { success: true };
    }
    case "getSickLeaveStats":
      return (async () => {
        try {
          console.log('getSickLeaveStats called with:', {
            period: params.period,
            groupBy: params.groupBy,
            rawInput: params
          });
          const { startDate, endDate } = parseDateRange(params.period);
          console.log('Successfully parsed date range:', {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString()
          });
          const stats = await calculateSickLeaveStats(startDate, endDate, params.groupBy);
          console.log('Retrieved stats:', stats);
          
          // Update the chart data using the event emitter
          updateChartData(stats, `Anzahl der Krankmeldungen für ${params.period}`);

          // Format stats data for the response message
          const statsDetails = stats.map(stat => `${stat.name}: ${stat.value} Krankmeldungen`).join('\n');
          
          return {
            message: `Ich habe die Krankmeldungsstatistik für ${params.period} im Statistik-Panel angezeigt.\n\nHier sind die Details:\n${statsDetails}`,
            stats: stats
          };
        } catch (error: any) {
          console.error('Error getting sick leave stats:', {
            error: error.message,
            input: params.period,
            stack: error.stack
          });
          throw new Error(error.message);
        }
      })();
    default:
      return { result: true };
  }
}

// Utility functions for email bodies
function generateSickEmailBody({ name, reason, expectedDuration, additionalNotes }: any) {
  return `
        <!DOCTYPE html>
        <html lang="de">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background-color: #f8f9fa;
              border-left: 4px solid #dc3545;
              padding: 15px;
              margin-bottom: 20px;
            }
            .header h2 {
              margin: 0;
              color: #dc3545;
              font-size: 24px;
            }
            .info-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            .info-table tr {
              border-bottom: 1px solid #eee;
            }
            .info-table tr:last-child {
              border-bottom: none;
            }
            .info-label {
              padding: 12px 0;
              font-weight: bold;
              width: 40%;
              color: #666;
            }
            .info-value {
              padding: 12px 0;
              color: #333;
            }
            .timestamp {
              font-size: 14px;
              color: #666;
              margin-top: 20px;
              margin-bottom: 30px;
              font-style: italic;
            }
            .signature {
              border-top: 1px solid #eee;
              padding-top: 20px;
              margin-top: 30px;
            }
            .powered-by {
              display: flex;
              align-items: center;
              gap: 8px;
              font-size: 12px;
              color: #666;
            }
            .powered-by img {
              max-width: 80px;
              height: auto;
            }
            @media only screen and (max-width: 600px) {
              body {
                padding: 10px;
              }
              .header {
                padding: 10px;
              }
              .info-label, .info-value {
                display: block;
                width: 100%;
                padding: 8px 0;
              }
              .powered-by img {
                max-width: 60px;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>Krankmeldung</h2>
          </div>
          <table class="info-table">
            <tr>
              <td class="info-label">Mitarbeiter</td>
          <td class="info-value">${name}</td>
            </tr>
            <tr>
              <td class="info-label">Grund</td>
          <td class="info-value">${reason}</td>
        </tr>
        <tr>
          <td class="info-label">Voraussichtliche Dauer</td>
          <td class="info-value">${expectedDuration || '-'}</td>
            </tr>
        ${additionalNotes ? `
        <tr>
          <td class="info-label">Zusätzliche Informationen</td>
          <td class="info-value">${additionalNotes}</td>
        </tr>` : ''}
          </table>
          <div class="timestamp">
            Gemeldet am: ${new Date().toLocaleString('de-DE', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              hour12: false
            })} Uhr
          </div>
          <div class="signature">
            <div class="powered-by">
              Powered by <img src="cid:s2-logo" alt="S2 Software Logo">
            </div>
          </div>
        </body>
        </html>
      `;
}

function generateVacationEmailBody({ name, reason, startDate, endDate, additionalNotes }: any) {
  return `
    <!DOCTYPE html>
    <html lang="de">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background-color: #f8f9fa;
          border-left: 4px solid #fd7e14;
          padding: 15px;
          margin-bottom: 20px;
        }
        .header h2 {
          margin: 0;
          color: #fd7e14;
          font-size: 24px;
        }
        .info-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        .info-table tr {
          border-bottom: 1px solid #eee;
        }
        .info-table tr:last-child {
          border-bottom: none;
        }
        .info-label {
          padding: 12px 0;
          font-weight: bold;
          width: 40%;
          color: #666;
        }
        .info-value {
          padding: 12px 0;
          color: #333;
        }
        .timestamp {
          font-size: 14px;
          color: #666;
          margin-top: 20px;
          margin-bottom: 30px;
          font-style: italic;
        }
        .signature {
          border-top: 1px solid #eee;
          padding-top: 20px;
          margin-top: 30px;
        }
        .powered-by {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: #666;
        }
        .powered-by img {
          max-width: 80px;
          height: auto;
        }
        @media only screen and (max-width: 600px) {
          body {
            padding: 10px;
          }
          .header {
            padding: 10px;
          }
          .info-label, .info-value {
            display: block;
            width: 100%;
            padding: 8px 0;
          }
          .powered-by img {
            max-width: 60px;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h2>Urlaubsantrag</h2>
      </div>
      <table class="info-table">
        <tr>
          <td class="info-label">Mitarbeiter</td>
          <td class="info-value">${name}</td>
        </tr>
        <tr>
          <td class="info-label">Grund</td>
          <td class="info-value">${reason || '-'}</td>
        </tr>
        <tr>
          <td class="info-label">Von</td>
          <td class="info-value">${startDate}</td>
        </tr>
        <tr>
          <td class="info-label">Bis</td>
          <td class="info-value">${endDate}</td>
        </tr>
        ${additionalNotes ? `
        <tr>
          <td class="info-label">Zusätzliche Informationen</td>
          <td class="info-value">${additionalNotes}</td>
        </tr>` : ''}
      </table>
      <div class="timestamp">
        Eingereicht am: ${new Date().toLocaleString('de-DE', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        })} Uhr
      </div>
      <div class="signature">
        <div class="powered-by">
          Powered by <img src="cid:s2-logo" alt="S2 Software Logo">
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Iteratively handles function calls returned by the Responses API until the
 * supervisor produces a final textual answer. Returns that answer as a string.
 */
async function handleToolCalls(
  body: any,
  response: any,
  addBreadcrumb?: (title: string, data?: any) => void,
) {
  let currentResponse = response;

  while (true) {
    if (currentResponse?.error) {
      return { error: 'Something went wrong.' } as any;
    }

    const outputItems: any[] = currentResponse.output ?? [];

    // Gather all function calls in the output.
    const functionCalls = outputItems.filter((item) => item.type === 'function_call');

    if (functionCalls.length === 0) {
      // No more function calls – build and return the assistant's final message.
      const assistantMessages = outputItems.filter((item) => item.type === 'message');

      const finalText = assistantMessages
        .map((msg: any) => {
          const contentArr = msg.content ?? [];
          return contentArr
            .filter((c: any) => c.type === 'output_text')
            .map((c: any) => c.text)
            .join('');
        })
        .join('\n');

      // Check if we have any stats data in the body input
      const statsData = body.input
        .filter((item: any) => item.type === 'function_call_output')
        .map((item: any) => {
          try {
            const output = JSON.parse(item.output);
            return output.stats || null;
          } catch (e) {
            return null;
          }
        })
        .filter(Boolean)[0];

      // If we have stats data, include it in the response
      if (statsData) {
        return {
          text: finalText,
          stats: statsData
        };
      }

      return finalText;
    }

    // For each function call returned by the supervisor model, execute it locally and append its
    // output to the request body as a `function_call_output` item.
    for (const toolCall of functionCalls) {
      const fName = toolCall.name;
      const args = JSON.parse(toolCall.arguments || '{}');
      const toolRes = await getToolResponse(fName, args);

      // Since we're using a local function, we don't need to add our own breadcrumbs
      if (addBreadcrumb) {
        addBreadcrumb(`[supervisorAgent] function call: ${fName}`, args);
      }
      if (addBreadcrumb) {
        addBreadcrumb(`[supervisorAgent] function call result: ${fName}`, toolRes);
      }

      // Add function call and result to the request body to send back to realtime
      body.input.push(
        {
          type: 'function_call',
          call_id: toolCall.call_id,
          name: toolCall.name,
          arguments: toolCall.arguments,
        },
        {
          type: 'function_call_output',
          call_id: toolCall.call_id,
          output: JSON.stringify(toolRes),
        },
      );
    }

    // Make the follow-up request including the tool outputs.
    currentResponse = await fetchResponsesMessage(body);
  }
}

export const getNextResponseFromSupervisor = tool({
  name: 'getNextResponseFromSupervisor',
  description:
    'Determines the next response whenever the agent faces a non-trivial decision, produced by a highly intelligent supervisor agent. Returns a message describing what to do next.',
  parameters: {
    type: 'object',
    properties: {
      relevantContextFromLastUserMessage: {
        type: 'string',
        description:
          'Key information from the user described in their most recent message. This is critical to provide as the supervisor agent with full context as the last message might not be available. Okay to omit if the user message didn\'t add any new information.',
      },
    },
    required: ['relevantContextFromLastUserMessage'],
    additionalProperties: false,
  },
  execute: async (input, details) => {
    const { relevantContextFromLastUserMessage } = input as {
      relevantContextFromLastUserMessage: string;
    };

    const addBreadcrumb = (details?.context as any)?.addTranscriptBreadcrumb as
      | ((title: string, data?: any) => void)
      | undefined;

    const history: RealtimeItem[] = (details?.context as any)?.history ?? [];
    const filteredLogs = history.filter((log) => log.type === 'message');

    const body: any = {
      model: 'gpt-4o-mini',
      input: [
        {
          type: 'message',
          role: 'system',
          content: supervisorAgentInstructions,
        },
        {
          type: 'message',
          role: 'user',
          content: `==== Conversation History ====
          ${JSON.stringify(filteredLogs, null, 2)}

          ==== Last User Message Context ====
          ${relevantContextFromLastUserMessage}`,
        },
      ],
      tools: supervisorAgentTools,
    };

    const response = await fetchResponsesMessage(body);
    const result = await handleToolCalls(body, response, addBreadcrumb);

    // Check if the result includes stats data
    if (typeof result === 'object' && result.text && result.stats) {
      return {
        message: result.text,
        stats: result.stats
      };
    }

    return result;
  },
});
  