import '../../../style/modules/html/contentTable.scss';

import * as d3Selection from 'd3-selection'
import {Component} from "./component";

const d3=Object.assign({},d3Selection);


/**
 * CLASSE ABSTRAITE SERVANT DE BASE A LA TITRAILLE
 */
class ContentTable extends Component {


    static type = '_Table';
    static defaultOptions = {};

    /**
     * CONSTRUCTEUR
     * @param id
     * @param options
     */
    constructor(id, options = {}) {
        super(id);
        this.options = {...ContentText.defaultOptions, ...options};
        this.container = d3.create('table')
            .attr('id', id)
            .classed(ContentTable.type, true);
    }

    data(data){
        
    }
    render(){

    }
}

export {ContentTable}