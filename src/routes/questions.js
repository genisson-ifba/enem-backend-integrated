import { readFileSync, accessSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { marked } from 'marked'
import { loadQuestion, loadAllQuestions, hasPublishedVersion } from '../services/questionLoader.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Function to process question context
function processQuestionContext(context) {
  if (!context) return context
  
  // Convert image URLs to local paths
  let processedContext = context.replace(
    /https:\/\/enem\.dev\/(.+)/g,
    '/exams/$1'
  )
  
  // Convert markdown to HTML
  processedContext = marked(processedContext)
  
  return processedContext
}

async function questionRoutes(fastify, options) {
  // Get all exams
  fastify.get('/exams', async (request, reply) => {
    try {
      const examsPath = join(__dirname, '../data/public/exams.json')
      const examsData = readFileSync(examsPath, 'utf-8')
      return JSON.parse(examsData)
    } catch (error) {
      fastify.log.error(error)
      reply.status(500).send({ error: 'Failed to load exams data' })
    }
  })

  // Get specific exam details
  fastify.get('/exams/:year', async (request, reply) => {
    try {
      const { year } = request.params
      const examPath = join(__dirname, `../data/public/exams/${year}/details.json`)
      const examData = readFileSync(examPath, 'utf-8')
      const exam = JSON.parse(examData)
      
      // Load full question details for each question
      const questionsWithDetails = []
      for (const question of exam.questions) {
        try {
          const questionPath = join(__dirname, `../data/public/exams/${year}/questions/${question.index}/details.json`)
          const questionData = readFileSync(questionPath, 'utf-8')
          const fullQuestion = JSON.parse(questionData)
          
          // Add the year to the question data
          fullQuestion.year = parseInt(year)
          
          // Process context (convert URLs and markdown to HTML)
          if (fullQuestion.context) {
            fullQuestion.context = processQuestionContext(fullQuestion.context)
          }
          
          if (fullQuestion.files) {
            fullQuestion.files = fullQuestion.files.map(file => 
              file.replace(/https:\/\/enem\.dev\/(.+)/, 'https://enem-frontend.vercel.app/exams/$1')
            )
          }
          
          if (fullQuestion.alternatives) {
            fullQuestion.alternatives = fullQuestion.alternatives.map(alt => ({
              ...alt,
              file: alt.file ? alt.file.replace(/https:\/\/enem\.dev\/(.+)/, 'https://enem-frontend.vercel.app/exams/$1') : alt.file
            }))
          }
          
          questionsWithDetails.push(fullQuestion)
        } catch (err) {
          // If individual question file doesn't exist, keep the basic info
          questionsWithDetails.push({
            ...question,
            year: parseInt(year)
          })
        }
      }
      
      // Return exam with full question details
      return {
        ...exam,
        questions: questionsWithDetails
      }
    } catch (error) {
      fastify.log.error(error)
      reply.status(404).send({ error: 'Exam not found' })
    }
  })

  // Get specific question
  fastify.get('/exams/:year/questions/:questionId', async (request, reply) => {
    try {
      const { year, questionId } = request.params
      const { language } = request.query
      
      // Use the integrated question loader (prioritizes edited versions)
      const question = loadQuestion(parseInt(year), questionId, language)
      
      // Process context (convert URLs and markdown to HTML)
      if (question.context) {
        question.context = processQuestionContext(question.context)
      }
      
      if (question.files) {
        question.files = question.files.map(file => 
          file.replace(/https:\/\/enem\.dev\/(.+)/, 'https://enem-frontend.vercel.app/exams/$1')
        )
      }
      
      if (question.alternatives) {
        question.alternatives = question.alternatives.map(alt => ({
          ...alt,
          file: alt.file ? alt.file.replace(/https:\/\/enem\.dev\/(.+)/, 'https://enem-frontend.vercel.app/exams/$1') : alt.file
        }))
      }
      
      return question
    } catch (error) {
      fastify.log.error(error)
      reply.status(404).send({ error: 'Question not found' })
    }
  })

  // Get multiple questions (for simulados)
  fastify.post('/simulados/questions', async (request, reply) => {
    try {
      const { year, questionIds } = request.body
      const questions = []

      for (const questionId of questionIds) {
        try {
          const questionPath = join(__dirname, `../data/public/exams/${year}/questions/${questionId}/details.json`)
          const questionData = readFileSync(questionPath, 'utf-8')
          questions.push(JSON.parse(questionData))
        } catch (err) {
          // Skip questions that don't exist
          continue
        }
      }

      return { questions }
    } catch (error) {
      fastify.log.error(error)
      reply.status(500).send({ error: 'Failed to load questions' })
    }
  })
}

export default questionRoutes