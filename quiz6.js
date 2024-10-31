let questions = [];
let currentQuestionIndex = 0;
let userResponses = [];
let startTime, totalQuizTime = 0;
let questionStartTime, questionTimes = [];
let skips = 0;
let hesitations = 0;
let mouseDistance = 0;
let questionMouseDistances = [];
let questionHesitations = [];
let previousMousePosition = null;

// Load the GIFT questions from the textarea and parse them
document.getElementById('loadQuizBtn').addEventListener('click', () => {
    const giftInput = document.getElementById('giftInput').value;
    questions = parseGIFT(giftInput);
    if (questions.length) {
        document.getElementById('startQuizBtn').style.display = 'inline';
        alert('GIFT questions loaded successfully!');
    } else {
        alert('No valid GIFT questions found!');
    }
});

// Start the quiz
document.getElementById('startQuizBtn').addEventListener('click', () => {
    if (questions.length === 0) return alert('Load a GIFT quiz first.');
    shuffleQuestionsAndAnswers();
    startTime = Date.now();
    displayQuestion(0);
    document.getElementById('quiz-container').style.display = 'block';
    document.getElementById('giftInput').style.display = 'none';
    document.getElementById('loadQuizBtn').style.display = 'none';
    document.getElementById('startQuizBtn').style.display = 'none';
});

// Parse and validate GIFT questions
function parseGIFT(input) {
    const lines = input.split('\n');
    let parsedQuestions = [], currentQuestion = null;

    lines.forEach(line => {
        line = line.trim();
        if (!line || line.startsWith('//')) return;
        if (line.startsWith('::')) {
            if (currentQuestion) parsedQuestions.push(currentQuestion);
            currentQuestion = { title: line.match(/::(.*?)::/)[1], text: '', originalText: '', answers: [], correctAnswer: null };
        } else if (line.startsWith('=')) {
            if (currentQuestion) currentQuestion.correctAnswer = line.slice(1).trim();
            currentQuestion.answers.push({ text: line.slice(1).trim(), isCorrect: true });
        } else if (line.startsWith('~')) {
            if (currentQuestion) currentQuestion.answers.push({ text: line.slice(1).trim(), isCorrect: false });
        } else {
            if (currentQuestion) {
                currentQuestion.text += line + ' ';
                currentQuestion.originalText += line + ' ';
            }
        }
    });
    if (currentQuestion) parsedQuestions.push(currentQuestion);
    return parsedQuestions;
}

// Shuffle questions and answers
function shuffleQuestionsAndAnswers() {
    questions = questions.sort(() => Math.random() - 0.5);
    questions.forEach(question => question.answers.sort(() => Math.random() - 0.5));
}

// Display the current question
function displayQuestion(index) {
    currentQuestionIndex = index;
    const question = questions[index];
    questionStartTime = Date.now();
    questionMouseDistances[index] = 0;
    questionHesitations[index] = 0;
    previousMousePosition = null;

    document.getElementById('question-title').innerText = question.title;
    document.getElementById('question-text').innerHTML = marked.parse(question.text.replace(/\{.*?\}/g, '')); // Remove curly braces for display
    document.getElementById('question-number').innerText = `Question ${index + 1} / ${questions.length}`;
    
    const answersForm = document.getElementById('answers-form');
    answersForm.innerHTML = ''; // Clear previous answers

    question.answers.forEach((answer, i) => {
        const answerLabel = document.createElement('label');
        answerLabel.innerHTML = `
            <input type="radio" name="answer" value="${answer.isCorrect}" onchange="trackHesitation(${index})">
            ${marked.parseInline(answer.text)}
        `;
        answersForm.appendChild(answerLabel);
        answersForm.appendChild(document.createElement('br'));
    });
}

// Track answer changes for hesitation
function trackHesitation(questionIndex) {
    questionHesitations[questionIndex]++;
    hesitations++;
}

// Track mouse movement for distance calculation
document.getElementById('quiz-container').addEventListener('mousemove', (event) => {
    if (previousMousePosition) {
        const dx = event.clientX - previousMousePosition.x;
        const dy = event.clientY - previousMousePosition.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        mouseDistance += distance;
        questionMouseDistances[currentQuestionIndex] += distance;
    }
    previousMousePosition = { x: event.clientX, y: event.clientY };
});

// Capture user selection
document.getElementById('nextQuestionBtn').addEventListener('click', () => {
    const selectedOption = document.querySelector('input[name="answer"]:checked');
    if (selectedOption) {
        const isCorrect = selectedOption.value === 'true';
        userResponses.push({ isCorrect, questionTime: Date.now() - questionStartTime, hesitations: questionHesitations[currentQuestionIndex]-1, mouseDistance: questionMouseDistances[currentQuestionIndex] });
    } else {
        skips++;
    }
    nextQuestion();
});

function nextQuestion() {
    questionTimes.push(Date.now() - questionStartTime);
    if (currentQuestionIndex < questions.length - 1) {
        displayQuestion(currentQuestionIndex + 1);
    } else {
        endQuiz();
    }
}

document.getElementById('skipQuestionBtn').addEventListener('click', () => {
    skips++;
    nextQuestion();
});

function endQuiz() {
    totalQuizTime = Date.now() - startTime;
    const correctAnswers = userResponses.filter(response => response.isCorrect).length;
    const finalScore = (correctAnswers / questions.length) * 100;
    const averageTime = totalQuizTime / questions.length;

    const resultContainer = document.getElementById('result-list');
    resultContainer.innerHTML = '';

    let resultTable = `<table border="1"><tr><th>Question (Original Markdown)</th><th>Status</th><th>Time Spent (s)</th><th>Hesitations</th><th>Mouse Distance (px)</th></tr>`;
    questions.forEach((question, i) => {
        const response = userResponses[i];
        const isCorrect = response ? response.isCorrect : false;
        resultTable += `<tr>
            <td>${question.originalText.trim()}</td>
            <td>${isCorrect ? '✔️' : '❌'}</td>
            <td>${(response.questionTime / 1000).toFixed(2)}</td>
            <td>${response.hesitations}</td>
            <td>${response.mouseDistance.toFixed(2)}</td>
        </tr>`;
    });
    resultTable += `</table>`;

    document.getElementById('result-list').innerHTML = resultTable;

    document.getElementById('finalScore').innerHTML = `
        Score: ${finalScore.toFixed(2)}% (${correctAnswers} out of ${questions.length})<br>
        Total Time: ${(totalQuizTime / 1000).toFixed(2)} seconds<br>
        Average Time per Question: ${(averageTime / 1000).toFixed(2)} seconds<br>
        Skips: ${skips}<br>
        Total nb of clicks: ${hesitations}<br>
        Total Mouse Distance: ${mouseDistance.toFixed(2)} px
    `;
    document.getElementById('quiz-container').style.display = 'none';
    document.getElementById('result-container').style.display = 'block';

    // Remove any existing download button before adding a new one
    const existingDownloadBtn = document.getElementById('downloadResultsBtn');
    if (existingDownloadBtn) {
        existingDownloadBtn.remove();
    }

    // Create and add the download button
    const downloadBtn = document.createElement('button');
    downloadBtn.id = 'downloadResultsBtn';
    downloadBtn.innerText = 'Download Results as TSV';
    downloadBtn.addEventListener('click', downloadResultsAsTSV);
    document.getElementById('result-container').appendChild(downloadBtn);
}

// Download results as a TSV file
function downloadResultsAsTSV() {
    let tsvData = "Question (Original Markdown)\tStatus\tTime Spent (s)\tHesitations\tMouse Distance (px)\n";
    questions.forEach((question, i) => {
        const response = userResponses[i];
        const isCorrect = response ? response.isCorrect : false;
        tsvData += `${question.originalText.trim()}\t${isCorrect ? 'Correct' : 'Incorrect'}\t${(response.questionTime / 1000).toFixed(2)}\t${response.hesitations}\t${response.mouseDistance.toFixed(2)}\n`;
    });

    const blob = new Blob([tsvData], { type: 'text/tab-separated-values' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'quiz_results.tsv';
    a.click();
    URL.revokeObjectURL(url);
}

// Retry and restart buttons
document.getElementById('retryQuizBtn').addEventListener('click', () => {
    userResponses = [];
    skips = 0;
    hesitations = 0;
    mouseDistance = 0;
    questionMouseDistances = [];
    questionHesitations = [];
    shuffleQuestionsAndAnswers();
    displayQuestion(0);
    startTime = Date.now();
    document.getElementById('result-container').style.display = 'none';
    document.getElementById('quiz-container').style.display = 'block';
});

document.getElementById('restartBtn').addEventListener('click', () => {
    location.reload(); // Reloads the page to allow reloading a new set of questions
});

