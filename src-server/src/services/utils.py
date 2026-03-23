from sqlalchemy.orm import QueryableAttribute, selectinload

type Relations = list[QueryableAttribute]

def build_load_options(
    relations: list[QueryableAttribute],
    root: QueryableAttribute | None = None,
):
    if root is not None:
        base = selectinload(root)
        return [base.selectinload(rel) for rel in relations]
    else:
        return [selectinload(rel) for rel in relations]
