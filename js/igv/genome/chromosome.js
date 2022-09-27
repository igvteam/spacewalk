const Chromosome = function (name, order, bpStart, bpLength, rangeLocus) {
    this.name = name

    // for dataset compatibility
    this.order = order ? 1 + order : 0
    this.index = this.order

    this.bpStart = bpStart

    this.bpLength = bpLength

    // for dataset compatibility
    this.size = this.bpLength

    this.rangeLocus = rangeLocus
}

export default Chromosome
