'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { Calendar, Clock, MapPin, Users, Sparkles, Zap, CalendarDays } from 'lucide-react'
import toast from 'react-hot-toast'

export default function TimetablePage() {
  const { data: session } = useSession()
  const [timetable, setTimetable] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState('monday')
  const { scrollY } = useScroll()
  const y = useTransform(scrollY, [0, 300], [0, 50])

  const fetchTimetable = useCallback(async () => {
    try {
      const response = await fetch(`/api/timetable?day=${selectedDay}`)
      if (response.ok) {
        const data = await response.json()
        setTimetable(data.timetable || [])
      } else {
        toast.error('Failed to fetch timetable')
      }
    } catch (error) {
      toast.error('Error fetching timetable')
    } finally {
      setLoading(false)
    }
  }, [selectedDay])

  useEffect(() => {
    fetchTimetable()
  }, [fetchTimetable])

  const days = [
    { value: 'monday', label: 'Monday' },
    { value: 'tuesday', label: 'Tuesday' },
    { value: 'wednesday', label: 'Wednesday' },
    { value: 'thursday', label: 'Thursday' },
    { value: 'friday', label: 'Friday' },
    { value: 'saturday', label: 'Saturday' },
  ]

  const timeSlots = [
    { start: '09:00', end: '10:00', period: '1st Period' },
    { start: '10:00', end: '11:00', period: '2nd Period' },
    { start: '11:15', end: '12:15', period: '3rd Period' },
    { start: '12:15', end: '13:15', period: '4th Period' },
    { start: '14:00', end: '15:00', period: '5th Period' },
    { start: '15:00', end: '16:00', period: '6th Period' },
  ]

  const getClassForTimeSlot = (timeSlot) => {
    return timetable.find(
      (classItem) => 
        classItem.day === selectedDay && 
        classItem.startTime === timeSlot.start
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <motion.div
          animate={{ 
            rotate: 360,
            scale: [1, 1.1, 1],
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="relative"
        >
          <div className="w-32 h-32 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <motion.div
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{ 
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 blur-xl"
          />
        </motion.div>
      </div>
    )
  }

  return (
    <div className="space-y-6 relative overflow-hidden">
      {/* Animated Background */}
      <motion.div
        style={{ y }}
        className="absolute inset-0 -z-10"
      >
        <div className="absolute top-0 left-1/4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute top-0 right-1/4 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-1/3 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10"
      >
        <div className="flex justify-between items-center mb-6">
          <div className="relative">
            <motion.h1 
              className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              Class Timetable
            </motion.h1>
            <motion.p 
              className="text-gray-600 dark:text-gray-300 mt-2 text-sm sm:text-lg"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              View your class schedule with style ✨
            </motion.p>
            <motion.div
              className="absolute -top-2 -right-2 w-4 h-4 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full"
              animate={{ 
                scale: [1, 1.2, 1],
                rotate: [0, 180, 360]
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          </div>
        </div>

        {/* Enhanced Day Selector */}
        <motion.div 
          className="backdrop-blur-lg bg-white/80 dark:bg-gray-800/80 rounded p-6 mb-6 border border-white/20 shadow-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <motion.div
              className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center"
              animate={{ 
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0]
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <CalendarDays className="h-4 w-4 text-white" />
            </motion.div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Select Day
            </h3>
          </div>
          <div className="flex flex-wrap gap-3">
            {days.map((day, index) => (
              <motion.button
                key={day.value}
                onClick={() => setSelectedDay(day.value)}
                className={`px-3 py-2 sm:px-6 sm:py-3 rounded text-xs sm:text-sm font-semibold transition-all duration-300 ${
                  selectedDay === day.value
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-sm'
                    : 'bg-white/50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 hover:bg-white/70 dark:hover:bg-gray-700/70 border border-white/20'
                }`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {day.label}
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Enhanced Timetable */}
        <motion.div 
          className="backdrop-blur-lg bg-white/80 dark:bg-gray-800/80 rounded p-6 border border-white/20 shadow-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <motion.div
              className="w-8 h-8 rounded-full bg-gradient-to-r from-green-500 to-blue-600 flex items-center justify-center"
              animate={{ 
                scale: [1, 1.1, 1],
                rotate: [0, -5, 5, 0]
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <Clock className="h-4 w-4 text-white" />
            </motion.div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Today&apos;s Schedule
            </h2>
          </div>
          
          <div className="space-y-4">
            {timeSlots.map((timeSlot, index) => {
              const classItem = getClassForTimeSlot(timeSlot)
              
              return (
                <motion.div
                  key={timeSlot.start}
                  initial={{ opacity: 0, y: 20, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ 
                    duration: 0.5,
                    delay: 0.7 + index * 0.1
                  }}
                  whileHover={{ 
                    scale: 1.02,
                    y: -5
                  }}
                  className={`backdrop-blur-lg rounded p-6 border border-white/20 shadow-sm transition-all duration-300 ${
                    classItem 
                      ? 'bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 border-blue-200 dark:border-blue-700' 
                      : 'bg-white/60 dark:bg-gray-800/60'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                      <motion.div 
                        className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"
                        whileHover={{ scale: 1.1 }}
                      >
                        <Clock className="w-5 h-5" />
                        <span className="font-semibold">{timeSlot.start} - {timeSlot.end}</span>
                      </motion.div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 bg-white/50 dark:bg-gray-700/50 px-3 py-1 rounded-full">
                        {timeSlot.period}
                      </span>
                    </div>
                    
                    {classItem ? (
                      <div className="flex flex-wrap items-center gap-3 sm:gap-6">
                        <div className="sm:text-right">
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                            {classItem.subject?.name}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {classItem.subject?.code}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <MapPin className="w-4 h-4" />
                          <span className="bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded-full">
                            {classItem.room || 'TBA'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <Users className="w-4 h-4" />
                          <span className="bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-full">
                            {classItem.faculty?.academicInfo?.name || 'TBA'}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-gray-500 dark:text-gray-400 text-sm bg-gray-100 dark:bg-gray-700 px-4 py-2 rounded-full">
                        No class scheduled
                      </div>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        </motion.div>

        {/* Enhanced Weekly Overview */}
        <motion.div 
          className="backdrop-blur-lg bg-white/80 dark:bg-gray-800/80 rounded p-6 border border-white/20 shadow-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <motion.div
              className="w-8 h-8 rounded-full bg-gradient-to-r from-yellow-500 to-orange-600 flex items-center justify-center"
              animate={{ 
                scale: [1, 1.1, 1],
                rotate: [0, 10, -10, 0]
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <Calendar className="h-4 w-4 text-white" />
            </motion.div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Weekly Overview
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {days.map((day, index) => {
              const dayClasses = timetable.filter(item => item.day === day.value)
              
              return (
                <motion.div 
                  key={day.value} 
                  className="backdrop-blur-lg bg-white/60 dark:bg-gray-700/60 rounded p-4 border border-white/20 hover:bg-white/80 dark:hover:bg-gray-700/80 transition-all duration-300"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 + index * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <h3 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <CalendarDays className="w-4 h-4" />
                    {day.label}
                  </h3>
                  <div className="space-y-2">
                    {dayClasses.length > 0 ? (
                      dayClasses.map((classItem, classIndex) => (
                        <motion.div 
                          key={classIndex} 
                          className="text-sm bg-blue-50 dark:bg-blue-900/30 p-3 rounded border border-blue-200 dark:border-blue-700"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 1 + index * 0.1 + classIndex * 0.05 }}
                        >
                          <div className="font-semibold text-gray-900 dark:text-white">
                            {classItem.subject?.name}
                          </div>
                          <div className="text-gray-600 dark:text-gray-400">
                            {classItem.startTime} - {classItem.endTime}
                          </div>
                        </motion.div>
                      ))
                    ) : (
                      <div className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 p-3 rounded">
                        No classes
                      </div>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}

