import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/**
 * Carrega uma questão com prioridade para versões editadas
 * @param {number} year - Ano da questão
 * @param {string} questionId - ID da questão
 * @param {string} language - Idioma opcional (ingles, espanhol)
 * @returns {Object} Dados da questão
 */
export function loadQuestion(year, questionId, language = null) {
  let questionPath
  
  // 1. PRIORIDADE 1: Verificar se há versão publicada (editada) no admin
  const adminPublishedPath = join(__dirname, `../../admin-backend/data/questions-published/${year}/${questionId}.json`)
  if (existsSync(adminPublishedPath)) {
    console.log(`Loading published question ${year}/${questionId} from admin`)
    const questionData = readFileSync(adminPublishedPath, 'utf-8')
    return JSON.parse(questionData)
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
export function loadAllQuestions(year) {
  try {
    const examPath = join(__dirname, `../data/public/exams/${year}/details.json`)
    const examData = readFileSync(examPath, 'utf-8')
    const exam = JSON.parse(examData)
    
    if (exam.questions && exam.questions.length > 0) {
      return exam.questions.map(question => {
        try {
          return loadQuestion(year, question.index)
        } catch (error) {
          console.warn(`Failed to load question ${year}/${question.index}:`, error.message)
          return null
        }
      }).filter(Boolean) // Remove questões que falharam ao carregar
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
  const adminPublishedPath = join(__dirname, `../../admin-backend/data/questions-published/${year}/${questionId}.json`)
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
    const adminPublishedPath = join(__dirname, `../../admin-backend/data/questions-published/${year}/${questionId}.json`)
    const questionData = JSON.parse(readFileSync(adminPublishedPath, 'utf-8'))
    return questionData._admin || null
  }
  return null
}