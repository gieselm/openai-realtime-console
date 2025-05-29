import { useEffect, useState } from "react";

const functionDescription = `
Call this function when a user asks for song recommendations.
`;

const sessionUpdate = {
  type: "session.update",
  session: {
    tools: [
      {
        type: "function",
        name: "recommend_song",
        description: functionDescription,
        parameters: {
          type: "object",
          strict: true,
          properties: {
            mood: {
              type: "string",
              description: "The mood or vibe of the recommended song.",
            },
            song: {
              type: "object",
              description: "Details about the recommended song",
              properties: {
                title: {
                  type: "string",
                  description: "The title of the song"
                },
                artist: {
                  type: "string",
                  description: "The artist who performs the song"
                },
                year: {
                  type: "number",
                  description: "The year the song was released"
                },
                genre: {
                  type: "string",
                  description: "The primary genre of the song"
                }
              },
              required: ["title", "artist", "year", "genre"]
            }
          },
          required: ["mood", "song"],
        },
      },
    ],
    tool_choice: "auto",
  },
};

function SongRecommendation({ functionCallOutput }) {
  const { mood, song } = JSON.parse(functionCallOutput.arguments);

  return (
    <div className="flex flex-col gap-4 mt-4">
      <div className="bg-white rounded-md p-4 shadow-sm border border-gray-200">
        <h3 className="text-lg font-bold mb-2">Song Recommendation</h3>
        <p className="text-gray-600 mb-4">Mood: {mood}</p>
        <div className="space-y-2">
          <p><span className="font-semibold">Title:</span> {song.title}</p>
          <p><span className="font-semibold">Artist:</span> {song.artist}</p>
          <p><span className="font-semibold">Year:</span> {song.year}</p>
          <p><span className="font-semibold">Genre:</span> {song.genre}</p>
        </div>
      </div>
      <pre className="text-xs bg-gray-100 rounded-md p-2 overflow-x-auto">
        {JSON.stringify(functionCallOutput, null, 2)}
      </pre>
    </div>
  );
}

export default function ToolPanel({
  isSessionActive,
  sendClientEvent,
  events,
}) {
  const [functionAdded, setFunctionAdded] = useState(false);
  const [functionCallOutput, setFunctionCallOutput] = useState(null);

  useEffect(() => {
    if (!events || events.length === 0) return;

    const firstEvent = events[events.length - 1];
    if (!functionAdded && firstEvent.type === "session.created") {
      sendClientEvent(sessionUpdate);
      setFunctionAdded(true);
    }

    const mostRecentEvent = events[0];
    if (
      mostRecentEvent.type === "response.done" &&
      mostRecentEvent.response.output
    ) {
      mostRecentEvent.response.output.forEach((output) => {
        if (
          output.type === "function_call" &&
          output.name === "recommend_song"
        ) {
          setFunctionCallOutput(output);
          setTimeout(() => {
            sendClientEvent({
              type: "response.create",
              response: {
                instructions: `
                ask for feedback about the song recommendation - don't repeat 
                the song details, just ask if they like the suggestion.
              `,
              },
            });
          }, 500);
        }
      });
    }
  }, [events]);

  useEffect(() => {
    if (!isSessionActive) {
      setFunctionAdded(false);
      setFunctionCallOutput(null);
    }
  }, [isSessionActive]);

  return (
    <section className="h-full w-full flex flex-col gap-4">
      <div className="h-full bg-gray-50 rounded-md p-4">
        <h2 className="text-lg font-bold">Song Recommendation Tool</h2>
        {isSessionActive ? (
          functionCallOutput ? (
            <SongRecommendation functionCallOutput={functionCallOutput} />
          ) : (
            <p>Ask for a song recommendation based on your mood...</p>
          )
        ) : (
          <p>Start the session to use this tool...</p>
        )}
      </div>
    </section>
  );
}