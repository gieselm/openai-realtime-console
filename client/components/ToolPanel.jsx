import { useEffect, useState } from "react";

const functionDescription = `
Call this function when a user asks for song recommendations similar to a specific song.
`;

const sessionUpdate = {
  type: "session.update",
  session: {
    tools: [
      {
        type: "function",
        name: "recommend_similar_songs",
        description: functionDescription,
        parameters: {
          type: "object",
          strict: true,
          properties: {
            originalSong: {
              type: "string",
              description: "The song that the user wants recommendations similar to",
            },
            recommendations: {
              type: "array",
              description: "Array of five similar song recommendations",
              items: {
                type: "object",
                properties: {
                  title: {
                    type: "string",
                    description: "Title of the recommended song"
                  },
                  artist: {
                    type: "string",
                    description: "Artist of the recommended song"
                  },
                  year: {
                    type: "string",
                    description: "Release year of the recommended song"
                  }
                },
                required: ["title", "artist", "year"]
              }
            },
          },
          required: ["originalSong", "recommendations"],
        },
      },
    ],
    tool_choice: "auto",
  },
};

function SongRecommendations({ functionCallOutput }) {
  const { originalSong, recommendations } = JSON.parse(functionCallOutput.arguments);

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-blue-50 p-4 rounded-md">
        <p className="font-bold">Original Song:</p>
        <p>{originalSong}</p>
      </div>
      <div className="flex flex-col gap-2">
        <p className="font-bold">Similar Songs:</p>
        {recommendations.map((song, index) => (
          <div
            key={index}
            className="bg-gray-50 p-4 rounded-md flex flex-col gap-1 border border-gray-200"
          >
            <p className="font-bold">{song.title}</p>
            <p className="text-gray-600">{song.artist}</p>
            <p className="text-gray-500 text-sm">{song.year}</p>
          </div>
        ))}
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
          output.name === "recommend_similar_songs"
        ) {
          setFunctionCallOutput(output);
          setTimeout(() => {
            sendClientEvent({
              type: "response.create",
              response: {
                instructions: `
                ask if they would like more recommendations or if they want to try a different song
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
        <h2 className="text-lg font-bold">Song Recommendations</h2>
        {isSessionActive ? (
          functionCallOutput ? (
            <SongRecommendations functionCallOutput={functionCallOutput} />
          ) : (
            <p>Tell me a song you like, and I'll recommend similar ones...</p>
          )
        ) : (
          <p>Start the session to get song recommendations...</p>
        )}
      </div>
    </section>
  );
}