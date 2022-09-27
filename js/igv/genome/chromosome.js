const Chromosome = function (name, order, bpStart, bpLength, rangeLocus) {
    this.name = name

    // for juiceboxjs dataset compatibility
    this.order = order ? 1 + order : 0
    this.index = this.order

    this.bpStart = bpStart

    this.bpLength = bpLength

    // for juiceboxjs dataset compatibility
    this.size = this.bpLength

    this.rangeLocus = rangeLocus
}

export default Chromosome
