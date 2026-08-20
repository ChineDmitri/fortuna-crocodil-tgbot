export const SUPPORTED_LANGUAGES = ['fr', 'en', 'ru'];

const dictionaries = {
  fr: {
    help: [
      'Commandes:',
      '/newgame - lancer une partie',
      '/stopgame - arreter la partie',
      '/guess mot - proposer une reponse',
      '/lang fr|en|ru - changer la langue',
      '',
      'Important: desactive Privacy Mode dans BotFather pour que le bot lise les reponses libres du groupe. Sinon utilise /guess mot.'
    ].join('\n'),
    onlyGroups: 'Cette commande fonctionne dans un groupe Telegram.',
    activeGame: 'Une partie est deja en cours dans ce groupe.',
    newGameCreated: '{creator}, ouvre le chat prive du bot pour saisir le mot secret.',
    setupPrivateSent: 'Je t ai envoye le bouton de creation du mot en prive.',
    setupPrivateFailed: 'Je ne peux pas encore t ecrire en prive. Ouvre ce lien puis appuie sur Start.',
    createWordButton: 'Creer le mot',
    privateCreateIntro: 'Partie dans {group}. Saisis le mot secret avec le bouton ci-dessous.',
    invalidStartLink: 'Ce lien de partie est invalide ou expire.',
    notYourGame: 'Ce lien est reserve a un autre joueur.',
    wordAlreadySet: 'Le mot est deja defini.',
    badGameState: 'Cette action n est pas disponible pour cette partie.',
    openCreateWord: 'Ouvre le formulaire pour definir le mot secret.',
    wordReady: 'Le mot est pret. Qui veut dessiner ?',
    drawButton: 'Je dessine',
    drawTaken: 'Un dessinateur est deja choisi.',
    drawerIsCreator: 'Le createur du mot ne peut pas dessiner cette manche.',
    drawerAssigned: '{drawer} dessine cette manche.',
    drawerPrivateSent: 'Je t ai envoye le canvas en prive.',
    drawerPrivateFailed: 'Je ne peux pas encore t ecrire en prive. Ouvre ce lien puis appuie sur Start.',
    openDraw: 'Ouvre le canvas pour dessiner.',
    drawOpenButton: 'Ouvrir le canvas',
    firstImageCaption: '{drawer} est en train de dessiner.',
    winner: '{winner} a trouve le mot: {word}. Partie terminee.',
    guessUsage: 'Utilise: /guess mot',
    wrongGuess: 'Ce n est pas le mot.',
    guessExcluded: 'Le createur du mot et le dessinateur ne peuvent pas gagner cette manche.',
    stopped: 'Partie arretee.',
    noActiveGame: 'Aucune partie active dans ce groupe.',
    expired: 'La partie a expire.',
    langUsage: 'Utilise: /lang fr, /lang en ou /lang ru.',
    langChanged: 'Langue changee en francais.',
    privateHelp: 'Ajoute-moi dans un groupe pour jouer. Les ecrans de saisie et de dessin s ouvrent ici en prive.',
    web: {
      createTitle: 'Mot secret',
      createSubtitle: 'Le mot ne sera jamais affiche dans le groupe.',
      wordLabel: 'Mot a deviner',
      wordPlaceholder: 'Exemple: crocodile',
      saveWord: 'Valider',
      saved: 'Mot enregistre. Tu peux fermer cette fenetre.',
      openFromTelegram: 'Ouvre cette page depuis le bouton Telegram.',
      invalidWord: 'Saisis un mot entre 2 et 60 caracteres.',
      requestFailed: 'La requete a echoue.',
      drawTitle: 'Canvas de dessin',
      secretWord: 'Mot',
      loadingWord: 'Chargement...',
      clear: 'Effacer',
      eraser: 'Gomme',
      brushSize: 'Taille',
      color: 'Couleur',
      sending: 'Envoi du dessin...',
      sent: 'Dessin envoye.',
      waiting: 'Dessine pour envoyer une image au groupe.'
    }
  },
  en: {
    help: [
      'Commands:',
      '/newgame - start a game',
      '/stopgame - stop the game',
      '/guess word - submit an answer',
      '/lang fr|en|ru - change language',
      '',
      'Important: disable Privacy Mode in BotFather so the bot can read free text group answers. Otherwise use /guess word.'
    ].join('\n'),
    onlyGroups: 'This command works in a Telegram group.',
    activeGame: 'A game is already running in this group.',
    newGameCreated: '{creator}, open the bot private chat to enter the secret word.',
    setupPrivateSent: 'I sent you the word creation button in private chat.',
    setupPrivateFailed: 'I cannot message you privately yet. Open this link and press Start.',
    createWordButton: 'Create word',
    privateCreateIntro: 'Game in {group}. Enter the secret word with the button below.',
    invalidStartLink: 'This game link is invalid or expired.',
    notYourGame: 'This link is reserved for another player.',
    wordAlreadySet: 'The word is already set.',
    badGameState: 'This action is not available for this game.',
    openCreateWord: 'Open the form to set the secret word.',
    wordReady: 'The word is ready. Who wants to draw?',
    drawButton: 'I draw',
    drawTaken: 'A drawer has already been chosen.',
    drawerIsCreator: 'The word creator cannot draw this round.',
    drawerAssigned: '{drawer} is drawing this round.',
    drawerPrivateSent: 'I sent you the drawing canvas in private chat.',
    drawerPrivateFailed: 'I cannot message you privately yet. Open this link and press Start.',
    openDraw: 'Open the canvas to draw.',
    drawOpenButton: 'Open canvas',
    firstImageCaption: '{drawer} is drawing.',
    winner: '{winner} guessed the word: {word}. Game over.',
    guessUsage: 'Use: /guess word',
    wrongGuess: 'That is not the word.',
    guessExcluded: 'The word creator and the drawer cannot win this round.',
    stopped: 'Game stopped.',
    noActiveGame: 'No active game in this group.',
    expired: 'The game expired.',
    langUsage: 'Use: /lang fr, /lang en or /lang ru.',
    langChanged: 'Language changed to English.',
    privateHelp: 'Add me to a group to play. Word and drawing screens open here in private chat.',
    web: {
      createTitle: 'Secret word',
      createSubtitle: 'The word will never be displayed in the group.',
      wordLabel: 'Word to guess',
      wordPlaceholder: 'Example: crocodile',
      saveWord: 'Save',
      saved: 'Word saved. You can close this window.',
      openFromTelegram: 'Open this page from the Telegram button.',
      invalidWord: 'Enter a word between 2 and 60 characters.',
      requestFailed: 'Request failed.',
      drawTitle: 'Drawing canvas',
      secretWord: 'Word',
      loadingWord: 'Loading...',
      clear: 'Clear',
      eraser: 'Eraser',
      brushSize: 'Size',
      color: 'Color',
      sending: 'Sending drawing...',
      sent: 'Drawing sent.',
      waiting: 'Draw to send an image to the group.'
    }
  },
  ru: {
    help: [
      'Команды:',
      '/newgame - начать игру',
      '/stopgame - остановить игру',
      '/guess слово - предложить ответ',
      '/lang fr|en|ru - изменить язык',
      '',
      'Важно: отключите Privacy Mode в BotFather, чтобы бот видел обычные ответы в группе. Иначе используйте /guess слово.'
    ].join('\n'),
    onlyGroups: 'Эта команда работает в группе Telegram.',
    activeGame: 'В этой группе уже идет игра.',
    newGameCreated: '{creator}, открой личный чат с ботом, чтобы ввести секретное слово.',
    setupPrivateSent: 'Я отправил кнопку создания слова в личный чат.',
    setupPrivateFailed: 'Я пока не могу написать тебе лично. Открой ссылку и нажми Start.',
    createWordButton: 'Создать слово',
    privateCreateIntro: 'Игра в группе {group}. Введи секретное слово кнопкой ниже.',
    invalidStartLink: 'Эта ссылка игры недействительна или устарела.',
    notYourGame: 'Эта ссылка предназначена для другого игрока.',
    wordAlreadySet: 'Слово уже задано.',
    badGameState: 'Это действие недоступно для этой игры.',
    openCreateWord: 'Открой форму, чтобы задать секретное слово.',
    wordReady: 'Слово готово. Кто будет рисовать?',
    drawButton: 'Я рисую',
    drawTaken: 'Художник уже выбран.',
    drawerIsCreator: 'Автор слова не может рисовать в этом раунде.',
    drawerAssigned: '{drawer} рисует в этом раунде.',
    drawerPrivateSent: 'Я отправил canvas для рисования в личный чат.',
    drawerPrivateFailed: 'Я пока не могу написать тебе лично. Открой ссылку и нажми Start.',
    openDraw: 'Открой canvas, чтобы рисовать.',
    drawOpenButton: 'Открыть canvas',
    firstImageCaption: '{drawer} рисует.',
    winner: '{winner} угадал слово: {word}. Игра окончена.',
    guessUsage: 'Используйте: /guess слово',
    wrongGuess: 'Это не то слово.',
    guessExcluded: 'Автор слова и художник не могут выиграть этот раунд.',
    stopped: 'Игра остановлена.',
    noActiveGame: 'В этой группе нет активной игры.',
    expired: 'Игра истекла по времени.',
    langUsage: 'Используйте: /lang fr, /lang en или /lang ru.',
    langChanged: 'Язык изменен на русский.',
    privateHelp: 'Добавьте меня в группу, чтобы играть. Экраны слова и рисования открываются здесь в личном чате.',
    web: {
      createTitle: 'Секретное слово',
      createSubtitle: 'Слово не будет показано в группе.',
      wordLabel: 'Слово для угадывания',
      wordPlaceholder: 'Например: крокодил',
      saveWord: 'Сохранить',
      saved: 'Слово сохранено. Можно закрыть окно.',
      openFromTelegram: 'Откройте эту страницу через кнопку Telegram.',
      invalidWord: 'Введите слово от 2 до 60 символов.',
      requestFailed: 'Запрос не выполнен.',
      drawTitle: 'Canvas для рисования',
      secretWord: 'Слово',
      loadingWord: 'Загрузка...',
      clear: 'Очистить',
      eraser: 'Ластик',
      brushSize: 'Размер',
      color: 'Цвет',
      sending: 'Отправка рисунка...',
      sent: 'Рисунок отправлен.',
      waiting: 'Рисуйте, чтобы отправить изображение в группу.'
    }
  }
};

export function resolveLanguage(language, fallback = 'ru') {
  if (SUPPORTED_LANGUAGES.includes(language)) {
    return language;
  }
  return SUPPORTED_LANGUAGES.includes(fallback) ? fallback : 'ru';
}

export function languageFromTelegramUser(user, fallback = 'ru') {
  const languageCode = String(user?.language_code ?? '')
    .toLowerCase()
    .split(/[-_]/)[0];

  if (SUPPORTED_LANGUAGES.includes(languageCode)) {
    return languageCode;
  }

  return resolveLanguage(fallback);
}

export function t(language, key, params = {}) {
  const lang = resolveLanguage(language);
  const value = key.split('.').reduce((current, part) => current?.[part], dictionaries[lang])
    ?? key.split('.').reduce((current, part) => current?.[part], dictionaries.fr)
    ?? key;

  if (typeof value !== 'string') {
    return value;
  }

  return value.replace(/\{(\w+)\}/g, (_, name) => String(params[name] ?? ''));
}

export function webStrings(language) {
  return dictionaries[resolveLanguage(language)].web;
}
