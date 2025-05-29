import { useEffect, useState } from "react";

const functionDescription = `
Call this function whenever a user mentions any song or asks about music recommendations.
This function MUST be called when users discuss music or mention songs they enjoy.
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
    ]
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
      console.log("Registering song recommendation function...");
      sendClientEvent(sessionUpdate);
      console.log("Function registration sent:", sessionUpdate);
      setFunctionAdded(true);

      // Encourage music discussion
      sendClientEvent({
        type: "response.create",
        response: {
          instructions: "Tell me about a song you like, and I'll recommend similar ones!"
        }
      });
    }

    // Log all events for debugging
    console.log("Received event:", events[0]);

    const mostRecentEvent = events[0];
    if (mostRecentEvent?.type === "response.done" && mostRecentEvent.response?.output) {
      console.log("Processing response output:", mostRecentEvent.response.output);
      
      mostRecentEvent.response.output.forEach((output) => {
        if (output.type === "function_call" && output.name === "recommend_similar_songs") {
          console.log("Song recommendation function called with args:", output.arguments);
          alert("Song recommendations function was called! Check the recommendations below.");
          setFunctionCallOutput(output);
          
          // Ask for feedback about recommendations
          sendClientEvent({
            type: "response.create",
            response: {
              instructions: "Ask if they would like more recommendations or want to try another song."
            }
          });
        }
      });
    }
  }, [events, functionAdded, sendClientEvent]);

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