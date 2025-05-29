import { useEffect, useState } from "react";

// Predefined song collection with file paths
const songDatabase = [
  {
    title: "Summer Breeze",
    artist: "The Sunset Kings",
    filepath: "/music/Perc_30.wav",
    genre: "Pop",
    mood: "happy"
  },
  {
    title: "Midnight Rain",
    artist: "Luna Eclipse",
    filepath: "/music/Perc_30.wav",
    genre: "Lo-fi",
    mood: "relaxed"
  },
  {
    title: "Electric Dreams",
    artist: "Neon Pulse",
    filepath: "/music/Perc_30.wav",
    genre: "Electronic",
    mood: "energetic"
  },
  {
    title: "Autumn Leaves",
    artist: "Acoustic Hearts",
    filepath: "/music/Perc_30.wav",
    genre: "Folk",
    mood: "melancholic"
  },
  {
    title: "Urban Rhythm",
    artist: "City Beats",
    filepath: "/music/Perc_30.wav",
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

function SongRecommendation({ functionCallOutput, onSongEnd }) {
  const [audioRef] = useState(() => new Audio());
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    const initializeAudio = async () => {
      if (!functionCallOutput?.arguments) return;

      try {
        const songData = JSON.parse(functionCallOutput.arguments);
        if (!songData?.song?.filepath) return;

        audioRef.src = songData.song.filepath;
        
        // Add ended event listener
        audioRef.addEventListener('ended', onSongEnd);
        
        try {
          await audioRef.play();
          if (mounted) {
            setIsPlaying(true);
            setError(null);
          }
        } catch (err) {
          if (mounted) {
            console.error("Playback failed:", err);
            setError("Failed to play audio automatically. Click play to try again.");
            setIsPlaying(false);
          }
        }
      } catch (err) {
        if (mounted) {
          console.error("Failed to parse song data:", err);
          setError("Failed to load song data");
        }
      }
    };

    initializeAudio();

    return () => {
      mounted = false;
      audioRef.removeEventListener('ended', onSongEnd);
      audioRef.pause();
      audioRef.src = "";
      setIsPlaying(false);
      setError(null);
    };
  }, [functionCallOutput, audioRef, onSongEnd]);

  const togglePlayback = async () => {
    try {
      if (isPlaying) {
        audioRef.pause();
        setIsPlaying(false);
      } else {
        await audioRef.play();
        setIsPlaying(true);
        setError(null);
      }
    } catch (err) {
      console.error("Playback toggle failed:", err);
      setError("Failed to play audio");
      setIsPlaying(false);
    }
  };

  if (!functionCallOutput?.arguments) return null;

  let song;
  try {
    song = JSON.parse(functionCallOutput.arguments).song;
  } catch (err) {
    return null;
  }

  if (!song) return null;

  return (
    <div className="flex flex-col gap-4 mt-4">
      <div className="bg-white rounded-md p-4 shadow-sm border border-gray-200">
        <h3 className="text-lg font-bold mb-2">Song Recommendation</h3>
        <div className="space-y-2">
          <p><span className="font-semibold">Title:</span> {song.title}</p>
          <p><span className="font-semibold">Artist:</span> {song.artist}</p>
          <p><span className="font-semibold">Genre:</span> {song.genre}</p>
          {error && (
            <p className="text-red-500 text-sm mt-2">{error}</p>
          )}
          <button 
            onClick={togglePlayback}
            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            {isPlaying ? "Pause" : "Play"}
          </button>
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

  const handleSongEnd = () => {
    // Reset the current session
    setFunctionAdded(false);
    setFunctionCallOutput(null);
    
    // Start a new session
    sendClientEvent(sessionUpdate);
    setFunctionAdded(true);
  };

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
            <SongRecommendation 
              functionCallOutput={functionCallOutput} 
              onSongEnd={handleSongEnd}
            />
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