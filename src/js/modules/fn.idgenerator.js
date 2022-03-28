function * idGenerator(prefix='id') {
    let index = 0;
    while(true)
        yield `${prefix}${index++}`;
}

export {idGenerator}