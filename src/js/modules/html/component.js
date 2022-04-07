import * as d3Selection from 'd3-selection'
import {idGenerator,componentsRegister} from '../common/components.js'
import {Queue} from '../common/queue.js'

const d3=Object.assign({},d3Selection);


class Component extends Queue{

    static type='_Component';

    /**
     * Constructeur
     * @param id {String} : identifiant du composant
     */
    constructor(id) {
        super();
        this.id = id || idGenerator(this);
        componentsRegister.add(this);
        this.state = { display: undefined, visibility: undefined };
    }

    /**
     * Renvoie le conteneur extérieur du composant (par défaut, renvoie vers le conteneur unique)
     * @returns {d3.selection}
     */
    get outerContainer(){
        return this.container;
    }

    /**
     * Renvoie le conteneur intérieur du composant (par défaut, renvoie vers le conteneur unique)
     * @returns {d3.selection}
     */
    get innerContainer(){
        return this.container;
    }

    /**
     * Crée un élément dans le composant
     * @param tag {String}: tag (div par défaut)
     * @param id {String} : id (optionnel)
     * @param classes {String} : classe (optionnel)
     * @returns {null|*} : selection d3
     */
    append(tag='div', id, classes) {
        return (!this.container) ?  null:
                                    this.container
                                        .append(tag)
                                        .attr('id',id)
                                        .attr('class',classes);
    }

    /**
     * Insère le composant dans le dom
     * @param parent {Component|d3.selection|String}: parent dans lequel insérer le composant. Au choix: objet hérité de Component | sélecteur | id du parent | selection d3
     * @returns {Component}
     */
    appendTo(parent) {
        //Impossible d'insérer ce qui n'a pas encore été créé
        if (!this.outerContainer)
            console.warn(`Aucun élément dans le DOM correspondant à ${this.id}: impossible de l'insérer`);
        //Determination du type de parent
        else {
            //Composant
            if (parent instanceof Component) {
                this.parentComponent=parent;
                this.parentContainer=parent.container || parent.innerContainer;
            }
            //Selection d3
            else if (parent instanceof d3.selection)
                this.parentContainer=parent;
            //Id
            else if (typeof parent === 'string' && parent.match(/[#\.]/g))
                this.parentContainer=d3.select(`${parent}`);
            //Selecteur
            else if (typeof parent === 'string')
                this.parentContainer=d3.select(`#${parent}`);
            //Sinon -> body
            else
                this.parentContainer = d3.select('body');
            //Insertion dans le DOM
            try {
                this.parentContainer.append(() => this.outerContainer.node());
            } catch (error) {
                this.appendTo(null);
            }
        }
        return this;
    }



    fadeOut(options= { } ) {
        options={...{duration:500,delay:0,type:'display'},...options};
        this.enqueue( () => new Promise((resolve, reject) => {
            this.outerContainer
                    .transition()
                    .duration(options.duration)
                    .delay(options.delay)
                    .style('opacity',0)
                    .on('end', ()=> {
                        if (options.type.display==='visibility') this.invisiblify();
                        else this.hide()
                        resolve( {msg:'hidden',target:this });
                    });
            }
        ));
        return this;
    }

    fadeIn(options= {  }) {
        options={...{duration:500,delay:0,type:'display'},...options};
        this.enqueue( () => new Promise((resolve, reject) => {
            this.outerContainer
                .style('display','block')
                .transition()
                .duration(options.duration)
                .delay(options.delay)
                .style('opacity',1)
               // .on('start', this.outerContainer.style('display','block') )
                .on('end', () => resolve( {msg:'showed',target: this }) );
        }));
        return this;
    }

    show(){
        this.state.display=true;
        this.outerContainer.style('display','initial').style('opacity',1);
        return this;
    }

    hide(){
        this.state.display=false;
        this.outerContainer.style('display','none');
        return this;
    }

    invisiblify(){
        this.state.visibility=false;
        this.outerContainer.style('visiblity','hidden');
        return this;
    }

    visiblifu(){
        this.state.visibility=true;
        this.outerContainer.style('visibility','visible');
        return this;
    }

    lower(){
        this.outerContainer.lower();
        return this;
    }
    raise(){
        this.outerContainer.raise();
        return this;
    }

    empty(){
        this.innerContainer.selectAll('*').remove();
        return this;
    }
}



export {Component}