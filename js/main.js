

//Se le llama cuando cargamos la página

window.onload = function () {
    //Referencia al formulario de selección de acciones: ATTACK, DEFEND, CAST
    actionForm = document.querySelector('form[name=select-action]');

    //Referencia al formulario de selección de target
    targetForm = document.querySelector('form[name=select-target]');

    //Referencia al formulario de selección de hechizos: HEAL, FIREBALL
    spellForm = document.querySelector('form[name=select-spell]');

    //Referencia al texto de información de la batalla
    infoPanel = document.querySelector('#battle-info');

    //Creación de botones

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


   // battle.start();
};