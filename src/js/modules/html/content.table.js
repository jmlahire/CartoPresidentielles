import '../../../style/modules/html/contentTable.scss';

import * as d3Selection from 'd3-selection';
import {Component} from "./component";
import {FormatPercent,FormatInt,FormatFloat} from "./../common/formats";

const d3=Object.assign({},d3Selection);


/**
 * CLASSE ABSTRAITE SERVANT DE BASE A LA TITRAILLE
 */
class ContentTable extends Component {


    static type = '_Table';

    /**
     * CONSTRUCTEUR
     * @param id
     */
    constructor(id) {
        super(id);
        this.container = d3.create('table')
            .attr('id', id)
            .classed(ContentTable.type, true);

    }

    tr(data=[], options={tag:'td'}) {
        let line=this.container.append('tr');
        data.forEach( (d)=> {
            let col=line.append(options.tag);
            if (d.colspan) col.attr('colspan',d.colspan);
            if (d.align) col.classed(d.align,true);
            if (!d.v && d.v!==0) col.text('-');
            else if (d.f==='int') col.text(FormatInt(d.v)).classed('right',true);
            else if (d.f==='float') col.text(FormatFloat(d.v, d.digits)).classed('right',true);
            else if (d.f==='percent') col.text(FormatPercent(d.v,d.digits)).classed('right',true);
            else if (d.f==='color') col.append('span').style('background',d.v);
            else col.text(d.v);
        })
        return this;
    }



    render(){

    }
}

export {ContentTable}