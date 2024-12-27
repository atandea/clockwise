import React, { useState, useEffect } from 'react'

const Timer: React.FC = () => {
  const [time, setTime] = useState(300)
  const [isRunning, setIsRunning] = useState(false)

  useEffect(() => {
    const timerId = setInterval(() => {
      if (isRunning && time > 0) {
        setTime(time - 1)
      }
    }, 1000)
    return () => clearInterval(timerId)
  }, [time, isRunning])

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes < 10 ? '0' : ''}${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`
  }

  const startTimer = (): void => setIsRunning(true)
  const stopTimer = (): void => setIsRunning(false)
  const resetTimer = (): void => {
    setIsRunning(false)
    setTime(300)
  }

  const progress = ((300 - time) / 300) * 100

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white relative">
      <div className="text-[15rem] font-mono mb-4">{formatTime(time)}</div>
      <div className="flex space-x-4 mb-4">
        <button onClick={startTimer} className="px-1 py-1 bg-gray-800 text-white rounded">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
            <path d="M8 5v14l11-7z" fill="currentColor" />
          </svg>
        </button>
        <button onClick={stopTimer} className="px-1 py-1 bg-gray-800 text-white rounded">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
            <path fill="currentColor" d="M14 19h4V5h-4M6 19h4V5H6z" />
          </svg>
        </button>
        <button onClick={resetTimer} className="px-1 py-1 bg-gray-800 text-white rounded">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M12 4c2.1 0 4.1.8 5.6 2.3c3.1 3.1 3.1 8.2 0 11.3c-1.8 1.9-4.3 2.6-6.7 2.3l.5-2c1.7.2 3.5-.4 4.8-1.7c2.3-2.3 2.3-6.1 0-8.5C15.1 6.6 13.5 6 12 6v4.6l-5-5l5-5zM6.3 17.6C3.7 15 3.3 11 5.1 7.9l1.5 1.5c-1.1 2.2-.7 5 1.2 6.8q.75.75 1.8 1.2l-.6 2q-1.5-.6-2.7-1.8"
            />
          </svg>
        </button>
      </div>
      <div className="w-full h-10 bg-gray-700 rounded absolute bottom-0">
        <div className="h-full bg-green-500 rounded" style={{ width: `${progress}%` }}></div>
      </div>
    </div>
  )
}

export default Timer
