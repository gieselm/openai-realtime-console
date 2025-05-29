import { useEffect, useState } from "react";

const functionDescription = `
You are a music expert. When users mention songs or ask for music recommendations, call this function to suggest similar songs.
Always provide recommendations when users talk about music or mention songs they like.
Consider genre, style, mood, era, and musical elements when making recommendations.
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
              description: "The original song the user mentioned",
            },
            similarSongs: {
              type: "array",
              description: "Array of five similar song recommendations",
              items: {
                type: "object",
                properties: {
                  title: {
                    type: "string",
                    description: "Title of the song",
                  },
                  artist: {
                    type: "string",
                    description: "Artist name",
                  },
                  reason: {
                    type: "string",
                    description: "Brief explanation of why this song is similar",
                  }
                },
                required: ["title", "artist", "reason"]
              }
            }
          },
          required: ["originalSong", "similarSongs"]
        }
      }
    ],
    tool_choice: "auto"
  }
};

function SongRecommendations({ functionCallOutput }) {
  const { originalSong, similarSongs } = JSON.parse(functionCallOutput.arguments);

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-blue-50 p-4 rounded-md">
        <h3 className="font-bold mb-2">Original Song</h3>
        <p>{originalSong}</p>
      </div>
      <div className="flex flex-col gap-2">
        <h3 className="font-bold">Similar Songs</h3>
        {similarSongs.map((song, index) => (
          <div key={index} className="bg-gray-50 p-4 rounded-md">
            <p className="font-bold">{song.title}</p>
            <p className="text-gray-600">by {song.artist}</p>
            <p className="text-sm mt-2 text-gray-700">{song.reason}</p>
          </div>
        ))}
      </div>
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
      console.log("🎵 Registering song recommendation function...");
      sendClientEvent(sessionUpdate);
      setFunctionAdded(true);
      
      // Send a follow-up message to encourage music discussion
      setTimeout(() => {
        sendClientEvent({
          type: "response.create",
          response: {
            instructions: "Ask the user what kind of music they like or what song they'd like recommendations for."
          }
        });
      }, 500);
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
          console.log("🎵 Song recommendation function called!", {
            arguments: JSON.parse(output.arguments)
          });
          setFunctionCallOutput(output);
          setTimeout(() => {
            sendClientEvent({
              type: "response.create",
              response: {
                instructions: "Ask if they would like to hear more recommendations or if they want to try another song."
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
          <p>Starting session...</p>
        )}
      </div>
    </section>
  );
}