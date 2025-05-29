import { useEffect, useState, useRef } from "react";

const songDatabase = [
  {
    title: "Summer Breeze",
    artist: "The Sunset Kings",
    filepath: "/music/summer_breeze.mp3",
    genre: "Pop",
    mood: "happy"
  },
  {
    title: "Midnight Rain",
    artist: "Luna Eclipse",
    filepath: "/music/midnight_rain.mp3",
    genre: "Lo-fi",
    mood: "relaxed"
  },
  {
    title: "Electric Dreams",
    artist: "Neon Pulse",
    filepath: "/music/electric_dreams.mp3",
    genre: "Electronic",
    mood: "energetic"
  },
  {
    title: "Autumn Leaves",
    artist: "Acoustic Hearts",
    filepath: "/music/autumn_leaves.mp3",
    genre: "Folk",
    mood: "melancholic"
  },
  {
    title: "Urban Rhythm",
    artist: "City Beats",
    filepath: "/music/urban_rhythm.mp3",
    genre: "Hip Hop",
    mood: "confident"
  }
];

const functionDescription = `
Call this function when a user asks for a song or music recommendation. Returns song details including a filepath.
Do not ask for their mood first - just recommend a random song from the collection.
`;

const sessionUpdate = {
  type: "session.update",
  session: {
    tools: [
      {
        type: "function",
        name: "get_song_filepath",
        description: functionDescription,
        parameters: {
          type: "object",
          strict: true,
          properties: {
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
                filepath: {
                  type: "string",
                  description: "The filepath where the song can be found"
                },
                genre: {
                  type: "string",
                  description: "The genre of the song"
                }
              },
              required: ["title", "artist", "filepath", "genre"]
            }
          },
          required: ["song"],
        },
      },
    ],
    tool_choice: "auto",
  },
};

function SongRecommendation({ functionCallOutput }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [localFile, setLocalFile] = useState(null);
  const audioRef = useRef(null);

  if (!functionCallOutput || !functionCallOutput.arguments) {
    return null;
  }

  let song;
  try {
    song = JSON.parse(functionCallOutput.arguments).song;
  } catch (error) {
    console.error("Failed to parse song data:", error);
    return null;
  }

  if (!song) {
    return null;
  }

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setLocalFile(url);
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.load();
      }
    }
  };

  return (
    <div className="flex flex-col gap-4 mt-4">
      <div className="bg-white rounded-md p-4 shadow-sm border border-gray-200">
        <h3 className="text-lg font-bold mb-2">Song Recommendation</h3>
        <div className="space-y-2">
          <p><span className="font-semibold">Title:</span> {song.title}</p>
          <p><span className="font-semibold">Artist:</span> {song.artist}</p>
          <p><span className="font-semibold">Genre:</span> {song.genre}</p>
          
          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select your own MP3 file to play:
              </label>
              <input
                type="file"
                accept="audio/mp3"
                onChange={handleFileSelect}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100"
              />
            </div>
            
            <div className="flex items-center gap-4">
              <audio 
                ref={audioRef}
                src={localFile || song.filepath}
                onEnded={() => setIsPlaying(false)}
              />
              <button
                onClick={handlePlayPause}
                className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
              >
                {isPlaying ? "Pause" : "Play"}
              </button>
            </div>
          </div>
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
          output.name === "get_song_filepath"
        ) {
          // Select a random song from the database
          const randomSong = songDatabase[Math.floor(Math.random() * songDatabase.length)];
          
          // Create the tool output with the selected song
          const toolOutput = {
            type: "tool.output",
            tool_call_id: output.tool_call_id,
            output: JSON.stringify({
              song: {
                title: randomSong.title,
                artist: randomSong.artist,
                filepath: randomSong.filepath,
                genre: randomSong.genre
              }
            })
          };
          
          // Send the tool output event
          sendClientEvent(toolOutput);
          
          // Update the function call output with the actual song data
          setFunctionCallOutput({
            ...output,
            arguments: JSON.stringify({
              song: {
                title: randomSong.title,
                artist: randomSong.artist,
                filepath: randomSong.filepath,
                genre: randomSong.genre
              }
            })
          });

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
            <p>Ask me to recommend a song...</p>
          )
        ) : (
          <p>Start the session to use this tool...</p>
        )}
      </div>
    </section>
  );
}