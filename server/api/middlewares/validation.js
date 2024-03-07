const Validation = {
  // validation req body data check
  validateSchema(schema) {
    return async (req, res, next) => {
      var data = req.body;
      var result = await schema.validate(data);
      if (result && result.error) {
        res.status(422).json({ message: result.error.details });
        res.end();
        return false;
      } else {
        next();
      }
    }

  }
}
module.exports = Validation