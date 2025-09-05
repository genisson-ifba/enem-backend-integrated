import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Admin backend URL for published questions
const ADMIN_API_URL = process.env.ADMIN_API_URL || 'https://enem-admin-backend.onrender.com'

/**
 * Check if a question has been published by the admin
 */
async function getPublishedQuestion(year, questionId) {
  try {
    const response = await fetch(`${ADMIN_API_URL}/api/questions/${year}/${questionId}/published`)
    if (response.ok) {
      const data = await response.json()
      if (data.success && data.question) {
        console.log(`Found published question ${year}/${questionId} from admin API`)
        return data.question
      }
    }
  } catch (error) {
    console.log(`Admin API not available or question not published: ${year}/${questionId}`)
  }
  return null
}

/**
 * Carrega uma questão com prioridade para versões editadas
 * @param {number} year - Ano da questão
 * @param {string} questionId - ID da questão
 * @param {string} language - Idioma opcional (ingles, espanhol)
 * @returns {Object} Dados da questão
 */
export async function loadQuestion(year, questionId, language = null) {
  let questionPath
  
  // 1. PRIORIDADE 1: Verificar se há versão publicada (editada) no admin API
  const publishedQuestion = await getPublishedQuestion(year, questionId)
  if (publishedQuestion) {
    return publishedQuestion
  }
  
  // 2. PRIORIDADE 2: Questão original com idioma específico
  if (language && (language === 'ingles' || language === 'espanhol')) {
    try {
      questionPath = join(__dirname, `../data/public/exams/${year}/questions/${questionId}-${language}/details.json`)
      if (existsSync(questionPath)) {
        const questionData = readFileSync(questionPath, 'utf-8')
        return JSON.parse(questionData)
      }
    } catch {
      // Continue para próxima opção
    }
  }
  
  // 3. PRIORIDADE 3: Questão original padrão
  questionPath = join(__dirname, `../data/public/exams/${year}/questions/${questionId}/details.json`)
  if (existsSync(questionPath)) {
    const questionData = readFileSync(questionPath, 'utf-8')
    return JSON.parse(questionData)
  }
  
  throw new Error(`Question not found: ${year}/${questionId}`)
}

/**
 * Carrega todas as questões de um ano (incluindo editadas)
 * @param {number} year - Ano das questões
 * @returns {Array} Array de questões
 */
export async function loadAllQuestions(year) {
  try {
    const examPath = join(__dirname, `../data/public/exams/${year}/details.json`)
    const examData = readFileSync(examPath, 'utf-8')
    const exam = JSON.parse(examData)
    
    if (exam.questions && exam.questions.length > 0) {
      const promises = exam.questions.map(async question => {
        try {
          return await loadQuestion(year, question.index)
        } catch (error) {
          console.warn(`Failed to load question ${year}/${question.index}:`, error.message)
          return null
        }
      })
      
      const questions = await Promise.all(promises)
      return questions.filter(Boolean) // Remove questões que falharam ao carregar
    }
    
    return []
  } catch (error) {
    console.error(`Failed to load exam ${year}:`, error.message)
    return []
  }
}

/**
 * Verifica se uma questão tem versão editada publicada
 * @param {number} year - Ano da questão
 * @param {string} questionId - ID da questão
 * @returns {boolean} True se tem versão editada
 */
export function hasPublishedVersion(year, questionId) {
  const adminPublishedPath = join(__dirname, `../data/questions-published/${year}/${questionId}.json`)
  return existsSync(adminPublishedPath)
}

/**
 * Obtém metadados de uma questão editada
 * @param {number} year - Ano da questão
 * @param {string} questionId - ID da questão
 * @returns {Object|null} Metadados ou null
 */
export function getQuestionMetadata(year, questionId) {
  if (hasPublishedVersion(year, questionId)) {
    const adminPublishedPath = join(__dirname, `../data/questions-published/${year}/${questionId}.json`)
    const questionData = JSON.parse(readFileSync(adminPublishedPath, 'utf-8'))
    return questionData._admin || null
  }
  return null
}