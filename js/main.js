
//--------------------------------------------------------------//
//                                                              //
//            EVENT EMITTER NO TOCAR                            //
//                     CLOSE please                             //
//--------------------------------------------------------------//
/*
Permite suscribir a las clases a eventos. 
Por ejemplo: Battle, hereda de EventEmitter y puedes generar eventos:
  this.emit('start', this._getCharIdsByParty());

Y este evento lo implementas asi:
battle.on('start', function (data) {
    console.log('START', data);
});
SOLO PUEDE HABER 10 EVENTOS
*/

//Event Emitter

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      } else {
        // At least give some kind of context to the user
        var err = new Error('Uncaught, unspecified "error" event. (' + er + ')');
        err.context = er;
        throw err;
      }
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        args = Array.prototype.slice.call(arguments, 1);
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    args = Array.prototype.slice.call(arguments, 1);
    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else if (listeners) {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.prototype.listenerCount = function(type) {
  if (this._events) {
    var evlistener = this._events[type];

    if (isFunction(evlistener))
      return 1;
    else if (evlistener)
      return evlistener.length;
  }
  return 0;
};

EventEmitter.listenerCount = function(emitter, type) {
  return emitter.listenerCount(type);
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}


//------------------------------------- CHARACTERS VIEW --------------------------------

/*
  CHARACTERS VIEW
  ---------------

  Lista de los atributos de los personajes



*/
function CharactersView() {
  this._views = {};
}

CharactersView.prototype._visibleFeatures = [
  'name',
  'party',
  'initiative',
  'defense',
  'hp',
  'mp',
  'maxHp',
  'maxMp'
];

//Devuelve todos los personajes
CharactersView.prototype.all = function () {
  return Object.keys(this._views).reduce(function (copy, id) {
    copy[id] = this._views[id];
    return copy;
  }.bind(this), {});
};

//Devuelve todos los personajes pertenecientes a una party
CharactersView.prototype.allFrom = function (party) {
  return Object.keys(this._views).reduce(function (copy, id) {
    if (this._views[id].party === party) {
      copy[id] = this._views[id];
    }
    return copy;
  }.bind(this), {});
};

//Devuelve un personaje pasando un ID
CharactersView.prototype.get = function (id) {
  return this._views[id] || null;
};


CharactersView.prototype.set = function (characters) {
  this._views = Object.keys(characters).reduce(function (views, id) {
    views[id] = this._getViewFor(characters[id]);
    return views;
  }.bind(this), {});
};

CharactersView.prototype._getViewFor = function (character) {
  return this._visibleFeatures.reduce(function (partialView, feature) {
    Object.defineProperty(partialView, feature, {
      get: function () {
        return character[feature];
      },
      set: function () {},
      enumerable: true
    });
    return partialView;
  }, {});
};


//------------------------------------- CHARACTERS VIEW --------------------------------


//-------------------------- TURN LIST -------------------------------------------------

//MANAGER DE TURNOS
function TurnList() {}

TurnList.prototype.reset = function (charactersById) {
  //Lista de Characters
  this._charactersById = charactersById;

  this._turnIndex = -1;//Indice del jugador que le toca atacar
  this.turnNumber = -1;//Indice dentro del turno (Turno es que ataquen los dos)

  //ID del Character activo
  this.activeCharacterId = null;

  //Una lista con los Characters ordenados por iniciativa.
  this.list = this._sortByInitiative();
};

TurnList.prototype.next = function () {
  this.turnNumber++;

  //Al inicio del turno, reordenamos la lista por iniciativa (Puede cambiar)
  if (this.turnNumber === 2)
  {
    this.turnNumber = 0;
    this.list = this._sortByInitiative();
  }

  //Rota al siguiente jugador
  this._turnIndex++;
  this._turnIndex = this._turnIndex % this.list.length;
  this.activeCharacterId = this.list[this._turnIndex];

  //Party actual
  var activeParty = this._charactersById[this.activeCharacterId].party;
  
  //Devuelve un Objeto con la party Actual y el ID del Jugador actual
  return {
    party: activeParty,
    activeCharacterId: this.activeCharacterId
  };
};

//Devuelve la lista de personajes ordenados por velocidad
TurnList.prototype._sortByInitiative = function () {
  var charactersById = this._charactersById;
  return Object.keys(charactersById).sort(byDecreasingInitiative);

  function byDecreasingInitiative(idA, idB) {
    var initiativeA = charactersById[idA].initiative;
    var initiativeB = charactersById[idB].initiative;
    return initiativeB - initiativeA;
  }
};

//-------------------------- TURN LIST -------------------------------------------------


//--------------------------------- OPTIONS  && OPTIONS STACK --------------------------------------------

//OPTIONS

//Event Emitter
//lista de opciones : Attack, Defend, Cast
//lista de opciones de hechizos : FireBall, Health
//lista de opciones de Target: Bat, Wizard
function Options(group) {
  EventEmitter.call(this);

  //En this._group guarda group si es un objeto
  this._group = {};

  if (typeof group === 'object')
    this._group = group;
}

Options.prototype = Object.create(EventEmitter.prototype);
Options.prototype.constructor = Options;

//Lista las opciones de Acciones: Attack, Defend, Cast
Options.prototype.list = function () {
  return Object.keys(this._group);
};

Options.prototype.get = function (id) {
  return this._group[id];
};

Options.prototype.select = function (id) {
  var currentGroup = this._group;
  if (!currentGroup.hasOwnProperty(id)) {
    this.emit('choseError', 'option-does-not-exist', id);
  } else {
    this.emit('chose', id, currentGroup[id]);
  }
};

//OPTIONS STACK
//Tiene una pila con todas las acciones que se han hecho en el juego
function OptionsStack() {
  this._stack = [];
  Object.defineProperty(this, 'current', {
    get: function () {
      return this._stack[this._stack.length - 1];
    },
    set: function (v) {
      if (!(v instanceof Options)) {
        v = new Options(v);
      }
      return this._stack.push(v);
    }
  });
}

OptionsStack.prototype.select = function (id) {
  return this.current.select(id);
};

OptionsStack.prototype.list = function () {
  return this.current.list();
};

OptionsStack.prototype.get = function (id) {
  return this.current.get(id);
};

OptionsStack.prototype.cancel = function () {
  this._stack.pop();
};

OptionsStack.prototype.clear = function () {
  this._stack = [];
};
//--------------------------------- OPTIONS --------------------------------------------

//------------------------------- ITEMS ------------------------------------------------

//Clase base de los objetos
function Item(name, effect) {
  this.name = name;
  this.effect = effect;
}

//Armas (ELIMINAR)
function Weapon(name, damage, extraEffect) {
  extraEffect = extraEffect || new Effect({});
  extraEffect.hp = -damage;
  Item.call(this, name, extraEffect);
}
Weapon.prototype = Object.create(Item.prototype);
Weapon.prototype.constructor = Weapon;

//Hechizos
function Scroll(name, cost, effect, uses) {
  Item.call(this, name, effect);
  this.cost = cost;
  this.uses = uses;//Número de usos del hechizo
}
Scroll.prototype = Object.create(Item.prototype);
Scroll.prototype.constructor = Scroll;

Scroll.prototype.canBeUsed = function (mp) {
  return (this.cost <= mp && this.uses > 0);
};

function Effect(variations) {
  Object.keys(variations).forEach(function (feature) {
    this[feature] = variations[feature];
  }.bind(this));
}
//------------------------------- ITEMS ------------------------------------------------


//------------------------ LIST TO MAP && MAP VALUES && D100 -----------------------------------

function listToMap(list, getIndex) {
    return list.reduce(function (map, item) {
      map[getIndex(item)] = item;
      return map;
    }, {});
}

function mapValues (map) {
    return Object.keys(map).map(function (key) {
      return map[key];
    });
}

function d100 (){
  return Math.floor(Math.random() * 100) + 1;
}

//------------------------ LIST TO MAP && MAP VALUES -----------------------------------

//------------------------------------ CHARACTERS --------------------------------------

function Character(name, features) {
  features = features || {};
  this.name = name;
  this.party = null;
  this.initiative = features.initiative || 0;
  this.defense = features.defense || 0;
  this.weapon = features.weapon || null;
  this._mp = features.mp || 0;
  this._hp = features.hp || 0;
  this.maxMp = features.maxMp || this.mp;
  this.maxHp = features.maxHp || this.hp || 15;
}

Character.prototype._immuneToEffect = ['name', 'weapon'];

Character.prototype.isDead = function () {
  return this.hp === 0;
};

Character.prototype.applyEffect = function (effect, isAlly) {
  if (isAlly || d100() > this.defense) {
    Object.keys(effect).forEach(function (affectedFeature) {
      var isImmune = this._immuneToEffect.indexOf(affectedFeature) > -1;
      if (!isImmune) {
        this[affectedFeature] += effect[affectedFeature];
      }
    }.bind(this));
    return true;
  }
  return false;
};

Object.defineProperty(Character.prototype, 'mp', {
  get: function () {
    return this._mp;
  },
  set: function (newValue) {
    this._mp = Math.max(0, Math.min(newValue, this.maxMp));
  }
});

Object.defineProperty(Character.prototype, 'hp', {
  get: function () {
    return this._hp;
  },
  set: function (newValue) {
    this._hp = Math.max(0, Math.min(newValue, this.maxHp));
  }
});

Object.defineProperty(Character.prototype, 'defense', {
  get: function () {
    return this._defense;
  },
  set: function (newValue) {
    this._defense = Math.max(0, Math.min(newValue, 100));
  }
});
//------------------------------------ CHARACTERS --------------------------------------


// CLASES BÁSICAS

function Battle() {
  EventEmitter.call(this);
  this._grimoires = {};
  this._charactersById = {};
  this._turns = new TurnList();

  this.options = new OptionsStack();
  this.characters = new CharactersView();
}
Battle.prototype = Object.create(EventEmitter.prototype);
Battle.prototype.constructor = Battle;

Object.defineProperty(Battle.prototype, 'turnList', {
  get: function () {
    return this._turns ? this._turns.list : null;
  }
});


Battle.prototype.setup = function (parties) {
  this._grimoires = this._extractGrimoiresByParty(parties);
  this._charactersById = this._extractCharactersById(parties);
  this._states = this._resetStates(this._charactersById);
  this._turns.reset(this._charactersById);

  this.characters.set(this._charactersById);
  this.options.clear();
};

Battle.prototype.start = function () {
  this._inProgressAction = null;
  this._stopped = false;
  this.emit('start', this._getCharIdsByParty());
  this._nextTurn();
};

Battle.prototype.stop = function () {
  this._stopped = true;
};


Object.defineProperty(Battle.prototype, '_activeCharacter', {
  get: function () {
    return this._charactersById[this._turns.activeCharacterId];
  }
});

Battle.prototype._extractGrimoiresByParty = function (parties) {
  var grimoires = {};
  var partyIds = Object.keys(parties);
  partyIds.forEach(function (partyId) {
    var partyGrimoire = parties[partyId].grimoire || [];
    grimoires[partyId] = listToMap(partyGrimoire, useName);
  });
  return grimoires;

  function useName(scroll) {
    return scroll.name;
  }
};

Battle.prototype._extractCharactersById = function (parties) {
  var idCounters = {};
  var characters = [];
  var partyIds = Object.keys(parties);
  partyIds.forEach(function (partyId) {
    var members = parties[partyId].members;
    assignParty(members, partyId);
    characters = characters.concat(members);
  });
  return listToMap(characters, useUniqueName);

  function assignParty(characters, party) {
    characters.forEach(function (character) {
      character.party = party;
    });
  }

  function useUniqueName(character) {
    var name = character.name;
    if (!(name in idCounters)) {
      idCounters[name] = 0;
    }
    var count = idCounters[name];
    idCounters[name]++;
    return name + (count === 0 ? '' : ' ' + (count + 1));
  }
};

Battle.prototype._resetStates = function (charactersById) {
  return Object.keys(charactersById).reduce(function (map, charId) {
    map[charId] = {};
    return map;
  }, {});
};

Battle.prototype._getCharIdsByParty = function () {
  var charIdsByParty = {};
  var charactersById = this._charactersById;
  Object.keys(charactersById).forEach(function (charId) {
    var party = charactersById[charId].party;
    if (!charIdsByParty[party]) {
      charIdsByParty[party] = [];
    }
    charIdsByParty[party].push(charId);
  });
  return charIdsByParty;
};


Battle.prototype._nextTurn = function () {
  if (this._stopped) { return; }
  setTimeout(function () {
    var endOfBattle = this._checkEndOfBattle();
    if (endOfBattle) {
      this.emit('end', endOfBattle);
    } else {
      var turn = this._turns.next();
      this._showActions();
      this.emit('turn', turn);
    }
  }.bind(this), 0);
};

Battle.prototype._checkEndOfBattle = function () {
  var allCharacters = mapValues(this._charactersById);
  var aliveCharacters = allCharacters.filter(isAlive);
  var commonParty = getCommonParty(aliveCharacters);
  return commonParty ? { winner: commonParty } : null;

  function isAlive(character) {
    return !character.isDead();
  }

  function getCommonParty(characters) {
    return characters.reduce(function (common, character) {
      return character.party !== common ? null : common;
    }, characters[0].party);
  }
};

Battle.prototype._showActions = function () {
  this.options.current = {
    'attack': true,
    'defend': true,
    'cast': true
  };
  this.options.current.on('chose', this._onAction.bind(this));
};

Battle.prototype._onAction = function (action) {
  this._action = {
    action: action,
    activeCharacterId: this._turns.activeCharacterId
  };
  this['_' + action]();
};

Battle.prototype._defend = function () {
  var activeCharacterId = this._action.activeCharacterId;
  var newDefense = this._improveDefense(activeCharacterId);
  this._action.targetId = this._action.activeCharacterId;
  this._action.newDefense = newDefense;
  this._executeAction();
};

Battle.prototype._improveDefense = function (targetId) {
  var states = this._states[targetId];
  var targetCharacter = this._charactersById[targetId];
  if (!states.improvedDefense) {
    states.improvedDefense = {
      originalDefense: targetCharacter.defense
    };
  }
  targetCharacter.defense = Math.ceil(targetCharacter.defense * 1.1);
  return targetCharacter.defense;
};

Battle.prototype._restoreDefense = function (targetId) {
  var states = this._states[targetId];
  if (states.improvedDefense) {
    this._charactersById[targetId].defense =
      states.improvedDefense.originalDefense;
    delete states.improvedDefense;
  }
};

Battle.prototype._attack = function () {
  var self = this;
  var activeCharacter = this._activeCharacter;
  self._showTargets(function onTarget(targetId) {
    self._action.effect = new Effect(activeCharacter.weapon.effect);
    self._action.targetId = targetId;
    self._executeAction();
    self._restoreDefense(targetId);
  });
};

Battle.prototype._cast = function () {
  var self = this;
  var activeCharacter = this._activeCharacter;
  self._showScrolls(function onScroll(scrollId, scroll) {
    self._showTargets(function onTarget(targetId) {
      self._action.effect = new Effect(scroll.effect);
      self._action.targetId = targetId;
      self._action.scrollName = scroll.name;
      activeCharacter.mp -= scroll.cost;
      self._executeAction();
      self._restoreDefense(targetId);
    });
  });
};

Battle.prototype._executeAction = function () {
  var action = this._action;
  var effect = this._action.effect || new Effect({});
  var activeCharacter = this._charactersById[action.activeCharacterId];
  var targetCharacter = this._charactersById[action.targetId];
  var areAllies = activeCharacter.party === targetCharacter.party;

  var wasSuccessful = targetCharacter.applyEffect(effect, areAllies);
  this._action.success = wasSuccessful;

  this._informAction();
  this._nextTurn();
};

Battle.prototype._informAction = function () {
  this.emit('info', this._action);
};

Battle.prototype._showTargets = function (onSelection) {
  var charactersById = this._charactersById;
  var aliveIds = this._turns.list.filter(isAlive);
  var characterIds = listToMap(aliveIds, useItem);
  this.options.current = characterIds;
  this.options.current.on('chose', onSelection);

  function useItem(item) {
    return item;
  }

  function isAlive(characterId) {
    return !charactersById[characterId].isDead();
  }
};

Battle.prototype._showScrolls = function (onSelection) {
  var caster = this._activeCharacter;
  var grimoire = this._grimoires[caster.party];
  var availableScrollsForCaster = mapValues(grimoire).filter(canBeCast);
  var scrollsIds = listToMap(availableScrollsForCaster, useName);
  this.options.current = scrollsIds;
  this.options.current.on('chose', onSelection);

  function canBeCast(scroll) {
    return scroll.canBeUsed(caster.mp);
  }

  function useName(scroll) {
    return scroll.name;
  }
};





//------------------------------- LIB -------------------------------------------

var lib = {
  Item: Item,
  Weapon: Weapon,
  Scroll: Scroll,
  Effect: Effect,
  Character: Character,

weapons: {
    get sword() {
      return new Weapon('sword', 25);
    },
    get wand() {
      return new Weapon('wand', 5);
    },
    get fangs() {
      return new Weapon('fangs', 10);
    },
    get pseudopode() {
      return new Weapon('pseudopode', 5, new Effect({ mp: -5 }));
    }
  },

  characters: {

    get heroTank() {
      return new Character('Tank', {
        initiative: 10,
        weapon: lib.weapons.sword,
        defense: 70,
        hp: 80,
        mp: 30
      });
    },

    get heroWizard() {
      return new Character('Wizz', {
        initiative: 4,
        defense: 50,
        weapon: lib.weapons.wand,
        hp: 40,
        mp: 100
      });
    },

    get monsterSkeleton() {
      return new Character('skeleton', {
        initiative: 9,
        defense: 50,
        weapon: lib.weapons.sword,
        hp: 100,
        mp: 0
      });
    },

    get monsterSlime() {
      return new Character('slime', {
        initiative: 2,
        defense: 40,
        weapon: lib.weapons.pseudopode,
        hp: 40,
        mp: 50
      });
    },

    get monsterBat() {
      return new Character('bat', {
        initiative: 30,
        defense: 80,
        weapon: lib.weapons.fangs,
        hp: 5,
        mp: 0
      });
    }
  },

  scrolls: {

    get health() {
      return new Scroll('health', 10, new Effect({ hp: 25 }),5);
    },

    get fireball() {
      return new Scroll('fireball', 30, new Effect({ initiative: 35 }),1);
    }

  }
};

//------------------------------- LIB -------------------------------------------

//------------------------------ MAIN COPIA -----------------------------------

var battle = new Battle();
var actionForm, spellForm, targetForm;
var infoPanel;

function prettifyEffect(obj) {
    return Object.keys(obj).map(function (key) {
        var sign = obj[key] > 0 ? '+' : ''; // show + sign for positive effects
        return `${sign}${obj[key]} ${key}`;
    }).join(', ');
}

battle.setup({
    heroes: {
        
        members: insertaHeroesAleatorios(),

        grimoire: [
            lib.scrolls.health,
            lib.scrolls.fireball
        ]
    },
    monsters: {
      
        members: insertaMonstruosAleatorios(),

    }

});

function insertaHeroesAleatorios()
{
/*
    var numTank = getRandomArbitrary(0,2);
    var numWizz = getRandomArbitrary(0,2);

    members = [];
    for(var i = 0; i < numTank; i++)
        members.push(lib.characters.heroTank);

    for(var i = 0; i < numWizz; i++)
      */
        members = [];

        members.push(lib.characters.heroWizard);

    return members;
}

function insertaMonstruosAleatorios()
{

  /*
    var numSlime = getRandomArbitrary(-1,2);
    var numBat = getRandomArbitrary(0,3);
    var numSkeleton = getRandomArbitrary(-1,2);

    members = [];
    for(var i = 0; i < numSlime; i++)
        members.push(lib.characters.monsterSlime);

    for(var i = 0; i < numBat; i++)
        members.push(lib.characters.monsterBat);

    for(var i = 0; i < numSkeleton; i++)
        members.push(lib.characters.monsterSkeleton);
*/
    members = [];

   members.push(lib.characters.monsterBat);

    return members;
}

function getRandomArbitrary(min, max) 
{
    return Math.random() * (max - min) + min;
}

function insertar (list,listHTML,idPersonaje)
    {
        var i = 0;
        var li; 
        
        form = listHTML.querySelector('[class=character-list]');
        form.innerHTML = "";
        for (var character in list)
        {
            //Declaro una variable para elegir donde quiero crear la lista(dentro de character-list)            
            li = document.createElement('li');//lista nueva donde se van a insertar los personajes en el HTML
            personaje = list[character];//Guardo en la variable auxiliar el contenido del personaje actual de la lista
            
            //8. MARCAR PERSONAJES COMO MUERTOS
            if (personaje.hp <= 0)
                li.classList.add('dead');

            li.innerHTML += personaje.name + " (HP:" + '<strong>' +  //strong sirve para poner las letras en negrita
            personaje.hp + '</strong>' + "/" + personaje.maxHp + 
            ", MP: " + '<strong>' + personaje.mp + '</strong>'+ "/" + 
            personaje.maxMp + ")";

            li.dataset.charaId = idPersonaje[i]; //Añado una etiqueta a la lista de personajes [charaId]
            form.appendChild(li); //Regresa una referencia al "nodo" creado
            i++;
        }
    

    }

function render ()
{
    //1. MOSTRAR LOS PERSONAJES
    // TODO: render the characters
    var listHeroes = battle.characters.allFrom("heroes"); // Creamos la lista y la obtenemos del objeto charactersById
    var listMonstruos = battle.characters.allFrom("monsters");

    //Guardamos en un array los nombres de los personajes
    var idHeroes = Object.keys(listHeroes);
    var idMonstruos = Object.keys(listMonstruos);

    var listHeroesHTML = document.getElementById('heroes'); //Creamos una lista que viene definida en el HTML
    var listMonstruosHTML  = document.getElementById('monsters');
    var personaje;//Variable que contiene el personaje actual segun la lista de personajes
    var form = [];


    insertar(listHeroes,listHeroesHTML, idHeroes);
    insertar(listMonstruos,listMonstruosHTML,idMonstruos);

    //1. MOSTRAR LOS PERSONAJES///

}

battle.on('start', function (data) {
    console.log('START', data);
});

battle.on('turn', function (data) {
    console.log('TURN', data);
    
    render();

    //2.MOSTRAR EL PERSONAJE SELECCIONADO
    // TODO: highlight current character

    var personajeActual = data.activeCharacterId;//Obtenemos el personaje actual
    //Obtenemos donde se encuentra el personaje en la lista
    var seleccionaPsj = document.querySelector('[data-chara-id=\"'+ personajeActual +'\"]');
   
    if(data.party === 'heroes')
        seleccionaPsj.classList.add('heroes');

    else if(data.party === 'monsters')
        seleccionaPsj.classList.add('monsters');

    //2.MOSTRAR EL PERSONAJE SELECCIONADO///


    //3. MOSTRAR EL MENÚ DE ACCIONES DE BATALLA
    // TODO: show battle actions form

    actionForm.style.display = 'inline';//Modificamos el estilo del boton para que se vea por pantalla
    var opciones = this.options.list();//Array con las opciones
    //Si le toca atacar a un enemigo, desactivamos la opción de lanzar un hechizo
    if (data.party === 'monsters')
        opciones.pop();

    var seleccion = actionForm.querySelector('[class=choices]');//Lugar donde deben ir las opciones(dentro de choices)
    seleccion.innerHTML = "";

    opciones.forEach(function(opcion){
        var li = document.createElement('li');//Creamos una nueva lista
        //Añadimos las opciones a la lista 
        li.innerHTML = '<label><input type="radio" name="option" value=' + opcion + '> <strong>' +opcion+ '</strong></label>'

        seleccion.appendChild(li);//Hace hijo al elemento seleccion de HTML
    });

    //3. MOSTRAR EL MENÚ DE ACCIONES DE BATALLA///

    //5. SELECCIONAR UN OBJETIVO
    targetForm.style.display = 'none';//Modificamos el estilo del boton para que se vea por pantalla
    var objetivos = this._charactersById;//Array con las opciones
    var seleccionObj = targetForm.querySelector('[class=choices]');//Lugar donde deben ir las opciones(dentro de choices)
    seleccionObj.innerHTML = "";

    for(var opcion in objetivos)
    {
        if (objetivos[opcion].hp > 0)
        {
            var li = document.createElement('li');//Creamos una nueva lista
            //Añadimos las opciones a la lista 
            li.innerHTML = '<label><input type="radio" name="target" value=\"' + opcion + '\""> <strong>' +opcion+ '</strong></label>'

            seleccionObj.appendChild(li);//Hace hijo al elemento seleccion de HTML
        }

    }

    //5. SELECCIONAR UN OBJETIVO///

    //6. SELECCIONAR UN HECHIZO

    spellForm.style.display = 'none';//Modificamos el estilo del boton para que se vea por pantalla
    var hechizos = this._grimoires[this._activeCharacter.party];//Array con las opciones
    var seleccionHechizos = spellForm.querySelector('[class=choices]');//Lugar donde deben ir las opciones(dentro de choices)
    seleccionHechizos.innerHTML = "";

    var pjActivo = this._charactersById[data.activeCharacterId];

    for(var hechizo in hechizos)
    {
        if (pjActivo.mp >= hechizos[hechizo].cost)
        {
            var li = document.createElement('li');//Creamos una nueva lista
            //Añadimos las opciones a la lista 
            li.innerHTML = '<label><input type="radio" name="spell" value=' + hechizo + '> <strong>' +hechizo+ '</strong></label>'

            seleccionHechizos.appendChild(li);//Hace hijo al elemento seleccion de HTML
        }
    }
    
    var button = spellForm.querySelector('[type=submit]');

     if(spellForm.elements.length === 1)
         button.disabled = true;
    else
         button.disabled = false;

    console.log(this);

    //6. SELECCIONAR UN HECHIZO///
});

battle.on('info', function (data) {
    console.log('INFO', data);
    //7. PANEL DE INFORMACIÓN
    // TODO: display turn info in the #battle-info panel

    var effectsTxt = prettifyEffect(data.effect || {});

    switch(data.action){
        case "attack":
            if(data.success){
                infoPanel.innerHTML='<strong>' + data.activeCharacterId + '</strong>' + " " + data.action 
                + "ed " + '<strong>' + data.targetId + '</strong>'+ " and caused " + effectsTxt;
            }
            else{
               infoPanel.innerHTML='<strong>' + data.activeCharacterId + '</strong>' + " " + data.action 
                + "ed " + '<strong>' + data.targetId + '</strong>' +" and failed";
            }
            break;
        case "defend":
                infoPanel.innerHTML='<strong>' + data.activeCharacterId + '</strong>' + " " + data.action 
                + "ed and his new defense is " + data.newDefense; 
                break;
        case "cast":
            if(data.success){
                infoPanel.innerHTML='<strong>' + data.activeCharacterId + '</strong>' + " " + data.action 
                + "ed " + data.scrollName + " on " +'<strong>' + data.targetId + '</strong>'+ " and caused " + effectsTxt;
            }
            else{
               infoPanel.innerHTML='<strong>' + data.activeCharacterId + '</strong>' + " " + data.action 
                + "ed " + data.scrollName + " on " +'<strong>' + data.targetId + '</strong>' + " and failed";
            }
            break;

    }

    //7. PANEL DE INFORMACIÓN///

});

battle.on('end', function (data) {
    console.log('END', data);

    //9. FINAL DEL JUEGO
    
    // TODO: re-render the parties so the death of the last character gets reflected
    render();

    // TODO: display 'end of battle' message, showing who won
    actionForm.style.display = 'none';

    infoPanel.innerHTML = "Battle is over! Winners were: " + '<strong>' + data.winner + '</strong>'
    +' <button type="submit"onClick="history.go(0)">New battle?</button>';

    //9. FINAL DEL JUEGO///
});

window.onload = function () {
    actionForm = document.querySelector('form[name=select-action]');
    targetForm = document.querySelector('form[name=select-target]');
    spellForm = document.querySelector('form[name=select-spell]');
    infoPanel = document.querySelector('#battle-info');

    actionForm.addEventListener('submit', function (evt) {
        evt.preventDefault();

        //4. SELECCIONAR ACCIÓN

        // TODO: select the action chosen by the player
        var action= actionForm.elements['option'].value;

        battle.options.select(action);
        actionForm.classList.add('required');
        
        // TODO: hide this menu

        actionForm.style.display = 'none';

        // TODO: go to either select target menu, or to the select spell menu

        if(action === 'attack'){
            targetForm.style.display = 'block';
        }
        else if(action === 'cast'){
            spellForm.style.display = 'block';
        }
        else if(action !== 'defend'){
            actionForm.style.display = 'block';
        }

        ///4. SELECCIONAR ACCIÓN

    });

    //5. SELECCIONAR UN OBJETIVO

    targetForm.addEventListener('submit', function (evt) {
        evt.preventDefault();
        
        // TODO: select the target chosen by the player
        var objetivo= targetForm.elements['target'].value;
        battle.options.select(objetivo);
        targetForm.classList.add('required');

        // TODO: hide this menu
        targetForm.style.display = 'none';
        actionForm.style.display = 'block';

    });

    targetForm.querySelector('.cancel')
    .addEventListener('click', function (evt) {
        evt.preventDefault();
        
        // TODO: cancel current battle options
        battle.options.cancel();
        // TODO: hide this form
        targetForm.style.display = 'none'; // oculta el formulario de acciones
        // TODO: go to select action menu
        actionForm.style.display = 'inline';

    });

    //5. SELECCIONAR UN OBJETIVO///

    //6. SELECCIONAR UN HECHIZO

    spellForm.addEventListener('submit', function (evt) {
        evt.preventDefault();
        // TODO: select the spell chosen by the player
        var hechizo= this.elements['spell'].value;
        battle.options.select(hechizo);
        // TODO: hide this menu
        spellForm.classList.add('required');
        spellForm.style.display = 'none';
        // TODO: go to select target menu
        targetForm.style.display = 'block';
             
    });

    spellForm.querySelector('.cancel')
    .addEventListener('click', function (evt) {
        evt.preventDefault();
        // TODO: cancel current battle options
        battle.options.cancel();
        // TODO: hide this form
        spellForm.style.display = 'none';
        // TODO: go to select action menu
        actionForm.style.display = 'inline';
    });

    //6. SELECCIONAR UN HECHIZO///


    battle.start();
};
