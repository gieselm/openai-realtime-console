import { useEffect, useState } from "react";

const functionDescription = `
Call this function when a user mentions a song to get a similar song recommendation.
`;

const sessionUpdate = {
  type: "session.update",
  session: {
    tools: [
      {
        type: "function",
        name: "recommend_similar_song",
        description: functionDescription,
        parameters: {
          type: "object",
          strict: true,
          properties: {
            original_song: {
              type: "string",
              description: "The song that the user mentioned.",
            },
            recommended_song: {
              type: "string",
              description: "A similar song recommendation.",
            },
            artist: {
              type: "string",
              description: "The artist of the recommended song.",
            },
            year: {
              type: "string",
              description: "The release year of the recommended song.",
            },
            reason: {
              type: "string",
              description: "Brief explanation of why this song is similar.",
            }
          },
          required: ["original_song", "recommended_song", "artist", "year", "reason"],
        },
      },
    ],
    tool_choice: "auto",
  },
};

function FunctionCallOutput({ functionCallOutput }) {
  const { original_song, recommended_song, artist, year, reason } = JSON.parse(functionCallOutput.arguments);

  return (
    <div className="flex flex-col gap-4 mt-4">
      <div className="bg-white p-4 rounded-md shadow-sm">
        <p className="text-gray-600 mb-2">Based on: {original_song}</p>
        <h3 className="text-xl font-bold mb-1">{recommended_song}</h3>
        <p className="text-gray-700">by {artist} ({year})</p>
        <p className="text-gray-600 mt-2 italic">{reason}</p>
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
          output.name === "recommend_similar_song"
        ) {
          setFunctionCallOutput(output);
          setTimeout(() => {
            sendClientEvent({
              type: "response.create",
              response: {
                instructions: `
                ask if they would like another song recommendation
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
            <FunctionCallOutput functionCallOutput={functionCallOutput} />
          ) : (
            <p>Tell me a song you like, and I'll recommend a similar one...</p>
          )
        ) : (
          <p>Start the session to use this tool...</p>
        )}
      </div>
    </section>
  );
}